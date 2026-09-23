import { createServerFn } from "@tanstack/react-start";
import OpenAI from "openai";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";

// Groq free tier (OpenAI-compatible API). Override with GROQ_MODEL / GROQ_VISION_MODEL if needed.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

// Keeps a document well inside the free tier's 8,000 tokens-per-minute limit.
const MAX_DOCUMENT_CHARS = 12000;
// Groq rejects base64 images larger than 4 MB.
const MAX_IMAGE_BASE64_CHARS = 4 * 1024 * 1024;
// The UI allows 10 MB files; base64 adds ~33%.
const MAX_FILE_BASE64_CHARS = 14 * 1024 * 1024;
// Older chat turns are dropped beyond this so long conversations stay under the rate limit.
const MAX_CHAT_HISTORY_CHARS = 12000;

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
const outputLanguage = z.enum(["en", "ur"], {
  errorMap: () => ({ message: "Please select a language." }),
});

function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid input.");
  }
  return result.data;
}

function formatDetails(fields: Record<string, string | undefined>): string {
  return Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
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

async function complete(
  messages: Message[],
  model = process.env.GROQ_MODEL || DEFAULT_MODEL,
  maxTokens?: number,
): Promise<{ text: string }> {
  const ai = getAI();
  try {
    const completion = await ai.chat.completions.create({ model, messages, max_tokens: maxTokens });
    return { text: completion.choices[0]?.message?.content ?? "" };
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

// Legal documents must not contain made-up facts, figures or citations.
const FACTS_RULE = `Accuracy rules:
- Use ONLY the facts the user provided. Do not add events, dates, amounts, fees, deadlines or documents that were not given.
- Never invent names, addresses, phone numbers, CNICs, case numbers or reference numbers — write a clear [placeholder] instead.
- Cite only Pakistani laws and sections you are certain exist. If unsure of an exact section number, name the law without a section.`;

const FIR_SYSTEM_PROMPT = `You are a senior Pakistani criminal lawyer with expertise in the Code of Criminal Procedure (CrPC) 1898 and Pakistan Penal Code (PPC) 1860.

Generate a properly formatted FIR (First Information Report) following Form 154 of the CrPC, in the language the user requests, using this structure:

---
FIRST INFORMATION REPORT (FIR)
Police Station: [Name of Police Station], [City]
FIR No: ______/[Current Year]        Date: [Today's Date]        Time: [Time of Filing]

1. COMPLAINANT INFORMATION
Name: [Complainant Name]
CNIC: [CNIC Number]
Address: [Complete Address]
Phone: [Phone Number]

2. INCIDENT DETAILS
Date of Incident: [Date]
Time of Incident: [Time]
Place of Incident: [Exact Location]

3. NARRATION OF FACTS
[Write a detailed, formal narration of the incident based on the provided description. Use third-person legal language.]

4. APPLICABLE LEGAL PROVISIONS
[List the relevant PPC sections with brief explanation of each one as it applies to this case]

5. PROPERTY / EVIDENCE (if applicable)
[List any property, items, or evidence involved]

6. SUSPECT DESCRIPTION (if available)
[Physical description or identification details if provided]

7. WITNESSES
1. [Witness 1 - Name and Contact Placeholder]
2. [Witness 2 - Name and Contact Placeholder]

8. VERIFICATION
I, the undersigned complainant, hereby declare that the above information is true and correct to the best of my knowledge and belief.

Complainant Signature: _____________    Date: _____________
---

When Urdu is requested, write the complete FIR in formal Urdu following the exact same structure.

${FACTS_RULE}

Be precise about PPC sections. Common sections: theft (379-382), robbery (392-395), cheating/fraud (420), murder (302), grievous hurt (337), extortion (383-387), criminal breach of trust (405-409), kidnapping (365-369), sexual assault (376), trespass (441-447), cybercrime (PECA 2016). Match sections to what occurred.`;

const TRANSLATOR_SYSTEM_PROMPT = `You are a Pakistani legal expert helping ordinary citizens understand complex legal documents. Be empathetic and clear — write as if explaining to someone with no legal background.

Analyze the provided document and output EXACTLY this structure:

---
## PLAIN LANGUAGE SUMMARY
[2-3 clear paragraphs explaining what this document means and the reader's situation.]

## سادہ خلاصہ
[Same summary in Urdu]

---
## KEY DATES & DEADLINES
[Bullet list: • DATE — what must happen by this date]

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
## LEGAL TERMS EXPLAINED
[For each key legal term: Term — plain English definition]

## قانونی اصطلاحات
[Same in Urdu]
---`;

const NOTICE_SYSTEM_PROMPT = `You are an experienced Pakistani advocate generating a formal legal notice for a client.

Generate a professionally formatted legal notice following Pakistani legal conventions. The notice must:
- Have a proper LEGAL NOTICE header with date
- Name the sending and receiving parties clearly
- Present background facts chronologically
- Cite only Pakistani law (never Indian statutes) — e.g. Contract Act 1872, Rent Restriction Ordinances, EOBI Act, PPC 1860, CrPC 1898, Sale of Goods Act, Consumer Protection Act, etc.
- State a specific demand with a clear deadline (14 days urgent, 30 days standard)
- State consequences of non-compliance
- End with a professional advocate signature block

Output TWO complete versions:

ENGLISH NOTICE:
---
[Complete formal legal notice in English]
---

URDU NOTICE (اردو نوٹس):
---
[Complete formal legal notice in formal Urdu]
---

${FACTS_RULE}`;

function buildNoticePrompt(data: Record<string, string>): string {
  const { noticeType, ...fields } = data;
  const typeDescriptions: Record<string, string> = {
    landlord: "Landlord-Tenant dispute",
    employment: "Employment dispute (wrongful termination or unpaid wages)",
    consumer: "Consumer complaint (defective goods or service fraud)",
    property: "Property dispute (boundary or encroachment)",
    cheque: "Dishonoured cheque notice under Section 489-F PPC",
  };
  const typeDesc = typeDescriptions[noticeType] || noticeType;
  const fieldsList = Object.entries(fields)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `Generate a formal legal notice for a ${typeDesc} case with these details:\n\n${fieldsList}`;
}

export type NoticeInput = { noticeType: string; [key: string]: string };

export type FIRInput = {
  description: string;
  language: "en" | "ur";
  name?: string;
  cnic?: string;
  address?: string;
  phone?: string;
  incidentDate?: string;
  incidentTime?: string;
  place?: string;
  witness1?: string;
  witness2?: string;
};

const FIR_DETAIL_MESSAGE = "Please provide more detail about the incident (at least 20 characters).";

const firSchema = z.object({
  description: field(LONG_FIELD, FIR_DETAIL_MESSAGE).min(20, FIR_DETAIL_MESSAGE),
  language: outputLanguage,
  name: optional(SHORT_FIELD),
  cnic: optional(SHORT_FIELD),
  address: optional(SHORT_FIELD),
  phone: optional(SHORT_FIELD),
  incidentDate: optional(SHORT_FIELD),
  incidentTime: optional(SHORT_FIELD),
  place: optional(SHORT_FIELD),
  witness1: optional(SHORT_FIELD),
  witness2: optional(SHORT_FIELD),
});

export const generateFIRDraft = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): FIRInput => validate(firSchema, data))
  .handler(async (ctx) => {
    const { description, language, name, cnic, address, phone, incidentDate, incidentTime, place, witness1, witness2 } = ctx.data;

    const langInstruction = language === "ur"
      ? "Generate the FIR in URDU ONLY. Do not include an English version."
      : "Generate the FIR in ENGLISH ONLY. Do not include an Urdu version.";

    const knownFields = [
      name && `Complainant Name: ${name}`,
      cnic && `CNIC: ${cnic}`,
      address && `Address: ${address}`,
      phone && `Phone: ${phone}`,
      incidentDate && `Date of Incident: ${incidentDate}`,
      incidentTime && `Time of Incident: ${incidentTime}`,
      place && `Place of Incident: ${place}`,
      witness1 && `Witness 1: ${witness1}`,
      witness2 && `Witness 2: ${witness2}`,
    ].filter(Boolean).join("\n");

    const userPrompt = `${langInstruction}\nToday's date: ${todayInPakistan()}\n\nIncident Description:\n${description}${knownFields ? `\n\nAdditional Details Provided:\n${knownFields}` : ""}`;

    return complete([
      { role: "system", content: FIR_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);
  });

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
  .handler(async (ctx) => {
    const { text, fileBase64, mediaType, language = "both" } = ctx.data;

    const langInstruction =
      language === "en" ? "\n\nIMPORTANT: Output the analysis in ENGLISH ONLY. Do not include any Urdu sections." :
      language === "ur" ? "\n\nاہم: تجزیہ صرف اردو میں فراہم کریں۔ انگریزی حصے شامل نہ کریں۔" :
      "";
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

    return complete([
      system,
      { role: "user", content: `${instruction}\n\n${documentText.slice(0, MAX_DOCUMENT_CHARS)}` },
    ]);
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
    process.env.GROQ_VISION_MODEL || DEFAULT_VISION_MODEL,
    TRANSCRIPTION_MAX_TOKENS,
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

const noticeSchema = z
  .object({
    noticeType: z.enum(["landlord", "employment", "consumer", "property", "cheque"], {
      errorMap: () => ({ message: "Please select a notice type." }),
    }),
  })
  .catchall(field(LONG_FIELD))
  .refine((d) => Object.keys(d).length <= 20, "Too many fields.")
  .refine(
    (d) => Object.keys(d).every((k) => /^[A-Za-z]{1,40}$/.test(k)),
    "Invalid field name.",
  );

export const generateLegalNotice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): NoticeInput => validate(noticeSchema, data))
  .handler(async (ctx) => {
    return complete([
      { role: "system", content: NOTICE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Today's date: ${todayInPakistan()}\n\n${buildNoticePrompt(ctx.data)}`,
      },
    ]);
  });

// ── Legal Chat ──────────────────────────────────────────────────────────────

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_SYSTEM_PROMPT = `You are PakLegal AI — a knowledgeable Pakistani legal assistant. You help ordinary Pakistani citizens understand the law in plain language.

Rules:
- Answer questions about Pakistani law: Constitution, PPC, CrPC, civil law, family law, property law, labour law, consumer protection, cyber crime, etc.
- Be clear, empathetic, and practical. Avoid excessive legal jargon.
- Always remind users to consult a qualified lawyer for their specific situation.
- Provide both English and Urdu explanations when the user writes in Urdu or asks for Urdu.
- Cite the relevant law/section when applicable (e.g. "Section 302 PPC", "Article 10 Constitution").
- Cite ONLY Pakistani law. Never cite Indian statutes or section numbers (e.g. the Indian Penal Code, BNS, or Section 138 of India's Negotiable Instruments Act). In Pakistan a dishonoured (bounced) cheque is an offence under Section 489-F PPC.
- If a question is outside Pakistani law, politely say so.
- Keep answers concise but complete — use bullet points for steps or lists.`;

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

export const askLegalQuestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): { messages: ChatMessage[] } => validate(chatSchema, data))
  .handler(async (ctx) => {
    return complete([
      { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\nToday's date: ${todayInPakistan()}` },
      ...recentHistory(ctx.data.messages),
    ]);
  });

// ── Bail Application ─────────────────────────────────────────────────────────

const BAIL_SYSTEM_PROMPT = `You are a senior Pakistani criminal defence lawyer. Generate a formal bail application for Sessions Court or High Court under the Code of Criminal Procedure (CrPC) 1898.

The application must include:
- Court heading and case details
- Applicant/accused details
- FIR details (if provided)
- Grounds for bail (health, ties to community, no flight risk, presumption of innocence, delay in trial, etc.)
- Legal provisions (Section 496-498 CrPC, Article 10 Constitution, relevant case law)
- Prayer / relief sought
- Advocate signature block

Output in the requested language only. Use formal legal language. Cite only Pakistani law — never Indian statutes.

${FACTS_RULE}`;

export type BailInput = {
  accusedName: string;
  accusedAddress: string;
  accusedCnic?: string;
  firNumber?: string;
  policeStation?: string;
  sections?: string;
  arrestDate?: string;
  court: string;
  grounds: string;
  advocateName?: string;
  language: "en" | "ur";
};

const bailSchema = z.object({
  accusedName: required(SHORT_FIELD, "Please provide the accused's name."),
  accusedAddress: required(SHORT_FIELD, "Please provide the accused's address."),
  accusedCnic: optional(SHORT_FIELD),
  firNumber: optional(SHORT_FIELD),
  policeStation: optional(SHORT_FIELD),
  sections: optional(SHORT_FIELD),
  arrestDate: optional(SHORT_FIELD),
  court: required(SHORT_FIELD, "Please specify the court."),
  grounds: required(LONG_FIELD, "Please provide grounds for bail."),
  advocateName: optional(SHORT_FIELD),
  language: outputLanguage,
});

export const generateBailApplication = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): BailInput => validate(bailSchema, data))
  .handler(async (ctx) => {
    const { language, ...fields } = ctx.data;
    const langInstruction = language === "ur"
      ? "Generate the bail application in URDU ONLY."
      : "Generate the bail application in ENGLISH ONLY.";
    return complete([
      { role: "system", content: BAIL_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${langInstruction}\nToday's date: ${todayInPakistan()}\n\nDetails:\n${formatDetails(fields)}`,
      },
    ]);
  });

// ── Consumer Complaint ───────────────────────────────────────────────────────

const COMPLAINT_SYSTEM_PROMPT = `You are a Pakistani consumer rights expert. Generate a formal complaint letter to the relevant Pakistani regulatory authority.

The complaint must include:
- Proper heading with authority name and address
- Complainant details
- Respondent/company details
- Chronological facts
- Legal basis (Consumer Protection Act, relevant provincial ordinance, PTA rules, NEPRA regulations, etc.)
- Specific relief/remedy requested
- Attachments list
- Complainant signature block

Identify the correct authority based on the complaint type:
- Telecom: PTA (Pakistan Telecommunication Authority)
- Electricity: NEPRA / relevant DISCO
- Gas: OGRA
- Banking/Finance: SBP Banking Mohtasib or SECP
- Insurance: SECP Insurance Division
- General Consumer: Provincial Consumer Protection Courts
- Online Fraud/Cybercrime: FIA Cybercrime Wing (now NCCIA — National Cyber Crime Investigation Agency)
- Government Departments (NADRA, passport, etc.): Wafaqi Mohtasib (Federal Ombudsman), the relevant Provincial Ombudsman, or the Pakistan Citizen's Portal

Output in the requested language only. Cite only Pakistani law — never Indian statutes.

${FACTS_RULE}`;

export type ComplaintInput = {
  complaintType: string;
  complainantName: string;
  complainantCnic?: string;
  complainantAddress: string;
  complainantPhone: string;
  respondentName: string;
  incidentDate: string;
  description: string;
  amountInvolved?: string;
  reliefSought: string;
  language: "en" | "ur";
};

const complaintSchema = z.object({
  complaintType: z.enum(
    ["electricity", "telecom", "banking", "consumer", "cybercrime", "government", "other"],
    { errorMap: () => ({ message: "Please select a complaint type." }) },
  ),
  complainantName: required(SHORT_FIELD, "Please provide your name."),
  complainantCnic: optional(SHORT_FIELD),
  complainantAddress: required(SHORT_FIELD, "Please provide your address."),
  complainantPhone: required(SHORT_FIELD, "Please provide your phone number."),
  respondentName: required(SHORT_FIELD, "Please provide the company or department name."),
  incidentDate: required(SHORT_FIELD, "Please provide the incident date."),
  description: required(LONG_FIELD, "Please describe the complaint."),
  amountInvolved: optional(SHORT_FIELD),
  reliefSought: required(SHORT_FIELD, "Please describe the relief you want."),
  language: outputLanguage,
});

export const generateConsumerComplaint = createServerFn({ method: "POST" })
  .inputValidator((data: unknown): ComplaintInput => validate(complaintSchema, data))
  .handler(async (ctx) => {
    const { language, ...fields } = ctx.data;
    const langInstruction = language === "ur"
      ? "Generate the complaint letter in URDU ONLY."
      : "Generate the complaint letter in ENGLISH ONLY.";
    return complete([
      { role: "system", content: COMPLAINT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${langInstruction}\nToday's date: ${todayInPakistan()}\n\nComplaint Details:\n${formatDetails(fields)}`,
      },
    ]);
  });
