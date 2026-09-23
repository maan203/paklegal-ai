import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { removeEmDashes } from "@/lib/utils";
import {
  buildContextBlock,
  CITATION_RULES,
  findUnsupportedCitations,
  LEGAL_CONTEXT_RULES,
  normalizeCitationMarks,
} from "@/lib/rag/context";
import {
  retrieveLegalSources,
  type LegalSource,
  type RetrievalResult,
  type RetrievalStatus,
} from "@/lib/rag/retrieve";
import { LAWS, type LawId } from "@/lib/rag/laws";

// Groq free tier (OpenAI-compatible API). Override with GROQ_MODEL / GROQ_VISION_MODEL if needed.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

// Keeps a document plus its legal context inside the free tier's 8,000 tokens-per-minute limit.
const MAX_DOCUMENT_CHARS = 10000;
// Groq rejects base64 images larger than 4 MB.
const MAX_IMAGE_BASE64_CHARS = 4 * 1024 * 1024;
// The UI allows 10 MB files; base64 adds ~33%.
const MAX_FILE_BASE64_CHARS = 14 * 1024 * 1024;
// Older chat turns are dropped beyond this so long conversations, plus up to ~7,000 characters
// of retrieved law, stay under the rate limit.
const MAX_CHAT_HISTORY_CHARS = 8000;

// ── Input validation ─────────────────────────────────────────────────────────

const SHORT_FIELD = 300;
const LONG_FIELD = 5000;

const field = (max: number, missingMessage = "Please fill in all required fields.") =>
  z
    .string({ required_error: missingMessage, invalid_type_error: "Invalid input." })
    .trim()
    .max(max, `One of the fields is too long (maximum ${max} characters).`);
const required = (max: number, message: string) => field(max, message).min(1, message);
const optional = (max: number) => field(max).optional();

function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data;
}

function todayInPakistan(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", dateStyle: "long" }).format(
    new Date(),
  );
}

function getAI() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured. Add it to .env.local for local dev, or run `npx wrangler secret put GROQ_API_KEY` for production.",
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

type Message = OpenAI.Chat.ChatCompletionMessageParam;

interface CompleteOptions {
  model?: string;
  maxTokens?: number;
  // Forces a JSON reply matching this schema (Groq structured outputs).
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  reasoningEffort?: "low" | "medium" | "high";
  // 0 makes the output repeatable (used for fact extraction).
  temperature?: number;
}

async function complete(
  messages: Message[],
  {
    model = process.env.GROQ_MODEL || DEFAULT_MODEL,
    maxTokens,
    jsonSchema,
    reasoningEffort,
    temperature,
  }: CompleteOptions = {},
): Promise<{ text: string }> {
  const ai = getAI();
  try {
    const completion = await ai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      reasoning_effort: reasoningEffort,
      temperature,
      response_format: jsonSchema
        ? { type: "json_schema", json_schema: { ...jsonSchema, strict: true } }
        : undefined,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    return { text: jsonSchema ? content : removeEmDashes(content) };
  } catch (err) {
    console.error("Groq API error:", err);
    if (err instanceof OpenAI.APIError) {
      if (err.status === 401 || err.status === 403) {
        throw new Error("The AI service rejected the API key. Check GROQ_API_KEY.");
      }
      if (err.status === 404) {
        throw new Error(`AI model "${model}" is not available. Set GROQ_MODEL to a current model.`);
      }
      // Groq reports "too large for your per-minute limit" as 413 or as 429 with this message;
      // retrying the same request can never succeed.
      if (err.status === 413 || (err.status === 429 && /request too large/i.test(err.message))) {
        throw new Error(
          "This request is too large for the free AI tier. Shorten the text or wait a minute and try again.",
        );
      }
      if (err.status === 429) {
        throw new Error("The AI service is rate-limited. Please try again in a minute.");
      }
      if (err.status !== undefined && err.status >= 500) {
        throw new Error(
          `The AI service is down right now (error ${err.status}). Please try again later.`,
        );
      }
      throw new Error(
        `The AI service returned an error (${err.status ?? "network"}): ${err.message}`,
      );
    }
    const detail = err instanceof Error ? ` (${err.message})` : "";
    throw new Error(`The AI service is unavailable right now${detail}. Please try again.`);
  }
}

const TRANSLATOR_SYSTEM_PROMPT = `You are a Pakistani legal expert helping ordinary citizens understand complex legal documents. Be empathetic and clear. Write as if explaining to someone with no legal background.

Analyze the provided document and output EXACTLY this structure:

---
## PLAIN LANGUAGE SUMMARY
[2-3 clear paragraphs explaining what this document means and the reader's situation.]

## سادہ خلاصہ
[Same summary in Urdu]

---
## KEY DATES & DEADLINES
[Bullet list: • DATE: what must happen by this date]

## اہم تاریخیں اور مہلتیں
[Same in Urdu]

---
## YOUR OBLIGATIONS
[Bullet list of what the person receiving this document must do]

## آپ کی ذمہ داریاں
[Same in Urdu]

---
## ⚠️ RISK FLAGS
[What happens if obligations are not met. What legal consequences may follow.]

## ⚠️ خطرات
[Same in Urdu]

---
## LAWS MENTIONED
[For each Article/Section the document cites, or that clearly applies to it: what it says in plain words, citing the LEGAL CONTEXT extract as [1], [2]. Use ONLY provisions in the LEGAL CONTEXT. If the document cites a provision that is not in the LEGAL CONTEXT, name it and say its text was not available. If none apply, write "None".]

## متعلقہ قوانین
[Same in Urdu]

---
## LEGAL TERMS EXPLAINED
[For each key legal term: Term: plain English definition]

## قانونی اصطلاحات
[Same in Urdu]
---

${CITATION_RULES}`;

// Every AI answer grounded in the legal knowledge base comes with its sources.
export type GroundedAnswer = {
  text: string;
  // Provisions retrieved from the knowledge base and given to the model for this answer.
  sources: LegalSource[];
  retrieval: RetrievalStatus;
  // Provisions the answer mentions that were not among the retrieved sources.
  unsupportedCitations: string[];
};

async function groundedComplete(
  messages: Message[],
  retrieval: { status: RetrievalStatus; sources: LegalSource[] },
): Promise<GroundedAnswer> {
  const answer = await complete(messages);
  const text = normalizeCitationMarks(answer.text);
  return {
    text,
    sources: retrieval.sources,
    retrieval: retrieval.status,
    unsupportedCitations: findUnsupportedCitations(text, retrieval.sources),
  };
}

function logRetrieval(
  feature: string,
  retrieval: { status: RetrievalStatus; sources: LegalSource[] },
  contextChars: number,
) {
  console.log(
    `RAG ${feature} ${retrieval.status}: ${retrieval.sources.map((s) => s.id).join(", ") || "no sources"} (${contextChars} chars of context sent to model)`,
  );
}

export const translateDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    validate(
      z
        .object({
          text: optional(50000),
          fileBase64: z
            .string()
            .max(MAX_FILE_BASE64_CHARS, "File is too large. Maximum size is 10 MB.")
            .optional(),
          mediaType: optional(100),
          language: z.enum(["en", "ur", "both"]).default("both"),
        })
        .refine((d) => d.text || d.fileBase64, "Please paste document text or upload a file."),
      data,
    ),
  )
  .handler(async (ctx): Promise<GroundedAnswer> => {
    const { text, fileBase64, mediaType, language = "both" } = ctx.data;

    const langInstruction =
      language === "en"
        ? "\n\nIMPORTANT: Output the analysis in ENGLISH ONLY. Do not include any Urdu sections."
        : language === "ur"
          ? "\n\nاہم: تجزیہ صرف اردو میں فراہم کریں۔ انگریزی حصے شامل نہ کریں۔"
          : "";
    const instruction = `Today's date: ${todayInPakistan()}\n\nAnalyze this legal document:${langInstruction}`;
    const system: Message = { role: "system", content: TRANSLATOR_SYSTEM_PROMPT };

    let documentText = text ?? "";
    if (fileBase64 && mediaType?.startsWith("image/")) {
      documentText = await transcribeImage(fileBase64, mediaType);
    } else if (fileBase64) {
      const bytes = Buffer.from(fileBase64, "base64");
      if (mediaType === "application/pdf") {
        documentText = await extractPdfText(bytes);
        if (!documentText.trim()) {
          throw new Error(
            "Could not read any text from this PDF (it may be a scanned image). Upload a photo or screenshot of the page instead, or paste the text.",
          );
        }
      } else if (mediaType?.startsWith("text/")) {
        documentText = bytes.toString("utf-8");
      } else {
        throw new Error("Unsupported file type. Please upload a PDF or an image.");
      }
    }

    // Provisions the document cites ("u/s 489-F PPC") are looked up directly; its opening
    // (usually the subject and facts) is also searched by meaning.
    const documentExcerpt = documentText.slice(0, MAX_DOCUMENT_CHARS);
    const retrieval = await retrieveLegalSources(documentExcerpt.slice(0, 1500), {
      referenceText: documentExcerpt,
      maxSources: 4,
      maxContextChars: 4500,
    });
    const context = buildContextBlock(retrieval);
    logRetrieval("document", retrieval, context.length);

    return groundedComplete(
      [
        system,
        { role: "user", content: `${instruction}\n\n${context}\n\nDOCUMENT:\n${documentExcerpt}` },
      ],
      retrieval,
    );
  });

// The free vision model allows only ~1,000 output tokens per minute, too few for a full
// analysis, so it only transcribes the text; the main model then analyses it like a PDF.
const TRANSCRIPTION_MAX_TOKENS = 900;

async function transcribeImage(base64: string, mediaType: string): Promise<string> {
  if (base64.length > MAX_IMAGE_BASE64_CHARS) {
    throw new Error("Image is too large. Please upload an image under 3 MB.");
  }
  const { text } = await complete(
    [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcribe all text in this document image exactly, in its original language (English or Urdu), preserving line breaks. Output only the transcription. If there is no readable text, output nothing.",
          },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
        ],
      },
    ],
    {
      model: process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL,
      maxTokens: TRANSCRIPTION_MAX_TOKENS,
    },
  );
  if (!text.trim()) {
    throw new Error("Could not read any text in this image. Please upload a clearer photo.");
  }
  return text;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (err) {
    console.error("PDF extraction error:", err);
    throw new Error("Could not open this PDF. It may be corrupted or password-protected.");
  }
}

// ── Legal Chat ──────────────────────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatAnswer = GroundedAnswer;

const CHAT_SYSTEM_PROMPT = `You are PakLegal AI, a knowledgeable Pakistani legal assistant. You help ordinary Pakistani citizens understand the law in plain language.

Rules:
- Answer questions about Pakistani law: Constitution, PPC, CrPC, civil law, family law, property law, labour law, consumer protection, cyber crime, etc.
- Be clear, empathetic, and practical. Avoid excessive legal jargon.
- Always remind users to consult a qualified lawyer for their specific situation.
- Cite ONLY Pakistani law. Never cite Indian statutes or section numbers (e.g. the Indian Penal Code, BNS, or Section 138 of India's Negotiable Instruments Act).
- If a question is outside Pakistani law, politely say so.
- Keep answers concise but complete. Use bullet points for steps or lists.

${LEGAL_CONTEXT_RULES}`;

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"], {
          errorMap: () => ({ message: "Invalid message role." }),
        }),
        content: required(20000, "Message cannot be empty."),
      }),
      { required_error: "No message provided.", invalid_type_error: "Invalid input." },
    )
    .min(1, "No message provided.")
    .max(100, "This conversation is too long. Please clear the chat and start again.")
    .refine((m) => m[m.length - 1].role === "user", "The last message must be a question.")
    .refine(
      (m) => m[m.length - 1].content.length <= 4000,
      "Your question is too long (maximum 4000 characters).",
    ),
});

// Keep the newest messages that fit the budget, always including the latest question.
function recentHistory(messages: ChatMessage[]): ChatMessage[] {
  const kept: ChatMessage[] = [];
  let total = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    total += messages[i].content.length;
    if (kept.length > 0 && total > MAX_CHAT_HISTORY_CHARS) break;
    kept.unshift(messages[i]);
  }
  // The model expects the conversation to start with a user turn.
  while (kept.length > 1 && kept[0].role !== "user") kept.shift();
  return kept;
}

// What to search the knowledge base for: the latest question, plus the previous one for
// short follow-ups ("what is the punishment?") that only make sense in context.
function retrievalQuery(messages: ChatMessage[]): string {
  const questions = messages.filter((m) => m.role === "user").map((m) => m.content);
  const latest = questions[questions.length - 1];
  const previous = questions[questions.length - 2];
  return latest.length < 80 && previous ? `${previous}\n${latest}` : latest;
}

export const askLegalQuestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { messages: ChatMessage[] } => validate(chatSchema, data))
  .handler(async (ctx): Promise<ChatAnswer> => {
    const retrieval = await retrieveLegalSources(retrievalQuery(ctx.data.messages));

    // The retrieved law goes with the latest question only; earlier turns stay as they were.
    const history = recentHistory(ctx.data.messages);
    const question = history[history.length - 1];
    const context = buildContextBlock(retrieval);
    logRetrieval("chat", retrieval, context.length);

    return groundedComplete(
      [
        { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\nToday's date: ${todayInPakistan()}` },
        ...history.slice(0, -1),
        { role: "user", content: `${context}\n\nQUESTION:\n${question.content}` },
      ],
      retrieval,
    );
  });

// ── Explain My Situation ─────────────────────────────────────────────────────
// The person describes what happened in their own words. Three steps:
//   1. Extract the facts into a fixed JSON structure (Groq structured outputs).
//   2. Retrieve the law for each legal issue found in those facts.
//   3. Explain their position from the retrieved law, in their language.

const SITUATION_CATEGORIES = [
  "theft_or_robbery",
  "fraud_or_cheque",
  "violence_or_threats",
  "harassment",
  "cybercrime",
  "arrest_or_police",
  "property_or_tenancy",
  "family",
  "employment",
  "consumer",
  "other",
] as const;

const factsSchema = z.object({
  language: z.enum(["en", "ur"]),
  summary: z.string(),
  category: z.enum(SITUATION_CATEGORIES),
  possibleCrime: z.boolean(),
  timeline: z.array(z.object({ when: z.string(), what: z.string() })),
  people: z.array(z.object({ role: z.string(), description: z.string() })),
  location: z.string(),
  losses: z.array(z.string()),
  evidence: z.array(z.string()),
  missingInfo: z.array(z.string()),
  searchPhrases: z.array(z.string()),
  urgent: z.boolean(),
  urgentReason: z.string(),
});

export type SituationFacts = z.infer<typeof factsSchema>;

// Same structure as factsSchema, in the JSON Schema form the model is constrained to.
const str = { type: "string" };
const strList = { type: "array", items: str };
const FACTS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(factsSchema.shape),
  properties: {
    language: { type: "string", enum: ["en", "ur"] },
    summary: str,
    category: { type: "string", enum: SITUATION_CATEGORIES },
    possibleCrime: { type: "boolean" },
    timeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["when", "what"],
        properties: { when: str, what: str },
      },
    },
    people: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["role", "description"],
        properties: { role: str, description: str },
      },
    },
    location: str,
    losses: strList,
    evidence: strList,
    missingInfo: strList,
    searchPhrases: strList,
    urgent: { type: "boolean" },
    urgentReason: str,
  },
};

const EXTRACTION_PROMPT = `You read a person's own description of a legal problem in Pakistan and extract the facts. You do not give advice here.

Rules:
- Use only what the person wrote. Never invent names, dates, amounts, places or events. Use "" or [] when something is not stated.
- language: "ur" if the description is mainly in Urdu (Urdu script or Roman Urdu), otherwise "en".
- Write summary, timeline, people, location, losses, evidence, missingInfo and urgentReason in the SAME language as the description.
- summary: 2-3 neutral sentences describing what happened.
- timeline: the events in order; "when" is the date/time exactly as stated, or "".
- people: everyone involved, with their role (e.g. victim, accused, witness, landlord, employer, police).
- losses: money, property or injuries mentioned. evidence: proof the person says they have.
- missingInfo: up to 5 important facts a lawyer would need that are missing, as short questions to the person.
- searchPhrases: 1 to 4 short ENGLISH phrases, one per legal issue, in plain words (e.g. "theft from a house at night", "police refusing to register a complaint"). No law names, no section numbers.
- possibleCrime: true if the situation may involve a criminal offence.
- urgent: true if someone is in danger or in custody, or a legal deadline is very close; urgentReason says why, otherwise "".`;

const SITUATION_PROMPT = `You are PakLegal AI. A person in Pakistan has described their situation. You are given the FACTS extracted from their description and the LEGAL CONTEXT retrieved for it. Explain their legal position in plain, calm language.

${CITATION_RULES}

Write these sections as Markdown "##" headings:
## What the law says
Which provisions in the LEGAL CONTEXT apply to these facts, and why, with citations. Say "may apply" where facts are unclear.
## Your rights
The rights that matter in this situation.
## What you can do next
Numbered, practical steps in a sensible order.
## Before you see a lawyer
The evidence and documents to gather, and questions to ask.

- Write everything in the language of the FACTS ("language"). For Urdu, use the headings "قانون کیا کہتا ہے", "آپ کے حقوق", "اب آپ کیا کر سکتے ہیں" and "وکیل سے ملنے سے پہلے", and keep provision numbers as written, e.g. "دفعہ 380، تعزیراتِ پاکستان".
- If "urgent" is true, start with one short line on what to do immediately.
- Keep it under about 450 words. Do not repeat the facts back at length.
- Never invent facts. This is legal information, not legal advice; end by suggesting a qualified lawyer.`;

async function extractFacts(narrative: string): Promise<SituationFacts> {
  const { text } = await complete(
    [
      { role: "system", content: `${EXTRACTION_PROMPT}\n\nToday's date: ${todayInPakistan()}` },
      { role: "user", content: narrative },
    ],
    {
      jsonSchema: { name: "situation_facts", schema: FACTS_JSON_SCHEMA },
      reasoningEffort: "low",
      // Same description -> same facts and search phrases -> same retrieval.
      temperature: 0,
      maxTokens: 2000,
    },
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }
  const result = factsSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Fact extraction returned invalid JSON:", text.slice(0, 500));
    throw new Error(
      "Could not understand the description. Please add a little more detail and try again.",
    );
  }
  const facts = result.data;
  return {
    ...facts,
    missingInfo: facts.missingInfo.slice(0, 5),
    searchPhrases: facts.searchPhrases.slice(0, 4),
  };
}

export type SituationAnalysis = GroundedAnswer & { facts: SituationFacts };

export const analyzeSituation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { narrative: string } =>
    validate(
      z.object({
        narrative: field(4000, "Please describe what happened.").min(
          40,
          "Please describe what happened in a little more detail (at least 40 characters).",
        ),
      }),
      data,
    ),
  )
  .handler(async (ctx): Promise<SituationAnalysis> => {
    const { narrative } = ctx.data;
    const facts = await extractFacts(narrative);

    const retrieval = await retrieveLegalSources(
      facts.searchPhrases.length ? facts.searchPhrases : [facts.summary],
      { referenceText: narrative, maxSources: 5, maxContextChars: 5000 },
    );
    const context = buildContextBlock(retrieval);
    logRetrieval("situation", retrieval, context.length);

    // The facts (not the raw narrative) go to the model, which keeps the request small.
    const { searchPhrases: _phrases, ...factsForModel } = facts;
    const answer = await groundedComplete(
      [
        { role: "system", content: `${SITUATION_PROMPT}\n\nToday's date: ${todayInPakistan()}` },
        {
          role: "user",
          content: `FACTS:\n${JSON.stringify(factsForModel, null, 1)}\n\n${context}`,
        },
      ],
      retrieval,
    );
    return { ...answer, facts };
  });

// ── Search the Law ───────────────────────────────────────────────────────────
// Retrieval only, no AI generation: finds the provisions closest in meaning to the query.

const LAW_IDS = LAWS.map((l) => l.id) as [LawId, ...LawId[]];

export const searchLaw = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { query: string; law?: LawId } =>
    validate(
      z.object({
        query: required(300, "Please type something to search."),
        law: z.enum(LAW_IDS, { errorMap: () => ({ message: "Unknown law." }) }).optional(),
      }),
      data,
    ),
  )
  .handler(async (ctx): Promise<RetrievalResult> => {
    const { query, law } = ctx.data;
    const result = await retrieveLegalSources(query, {
      laws: law ? [law] : undefined,
      maxSources: 10,
      maxContextChars: Number.POSITIVE_INFINITY,
      maxGapFromBest: null,
    });
    console.log(
      `Search "${query.slice(0, 60)}": ${result.status}, ${result.sources.length} results`,
    );
    return result;
  });
