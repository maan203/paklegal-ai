# PakLegal AI

**Free AI-powered legal assistance for Pakistani citizens — in Urdu and English.**

PakLegal AI helps ordinary people understand court documents, draft FIRs, know their constitutional rights, and access the legal system without needing to hire a lawyer for every question.

---

## Features

| Tool | Description |
|------|-------------|
| 💬 **Legal Chat** | Ask any question about Pakistani law in plain Urdu or English. Answers are grounded in the official text of Pakistani laws, with the Articles/Sections used shown under each answer |
| 📄 **Court Order Translator** | Upload an FIR, summons, or court order — get a plain-language summary |
| 📝 **FIR Drafting Assistant** | Describe what happened, get a correctly formatted FIR citing PPC & CrPC |
| ⚖️ **Bail Application** | Generate a complete bail application with legal grounds and case law |
| 📬 **Legal Notice Generator** | Draft formal notices for rent disputes, wrongful termination, bounced cheques |
| 🚨 **Consumer Complaint** | File complaints against utilities, banks, telecom companies, and government departments |
| 🛡️ **Know Your Rights** | Browse 22+ rights under the Constitution of Pakistan 1973, searchable by category |

---

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React + SSR)
- **Deployment:** Cloudflare Workers (edge)
- **AI:** [Groq](https://console.groq.com/) API — `openai/gpt-oss-120b` (override with `GROQ_MODEL`)
- **Legal knowledge base (RAG):** Cloudflare Workers AI embeddings (`@cf/baai/bge-m3`, multilingual incl. Urdu) + Cloudflare Vectorize
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **i18n:** Custom Urdu/English context with RTL support

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Groq API key](https://console.groq.com/keys)
- A free Cloudflare account, logged in with `npx wrangler login` (for the legal knowledge base)

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/paklegal-ai.git
cd paklegal-ai
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
GROQ_API_KEY=your_groq_api_key_here
# Optional: use a different Groq model
# GROQ_MODEL=openai/gpt-oss-120b
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

The Legal Chat searches the knowledge base in your Cloudflare account, so run `npx wrangler login` first.
To run without Cloudflare (the chat then answers without legal sources), use `RAG_OFFLINE=1 npm run dev`.

### Build for Production

```bash
npm run build
```

### Deploy to Cloudflare Workers

Set the API key as a Worker secret once (`.env.local` is not deployed):

```bash
npx wrangler secret put GROQ_API_KEY
```

Then deploy:

```bash
npm run deploy
```

---

## Legal Knowledge Base (RAG)

The Legal Chat uses Retrieval-Augmented Generation: before Groq answers, the app finds the relevant provisions in the official text of Pakistani laws and gives them to the model as context.

**Laws included** (official PDFs from [Pakistan Code](https://pakistancode.gov.pk)): Constitution of Pakistan 1973, Pakistan Penal Code 1860, Code of Criminal Procedure 1898, Prevention of Electronic Crimes Act 2016. About 1,500 Articles/Sections in total.

**How an answer is produced**

1. **Direct lookup:** provisions named in the question ("Section 489-F PPC", "دفعہ 302", "Article 10A") are fetched by ID.
2. **Meaning search:** the question (plus glossary terms, e.g. "FIR" → "information in cognizable cases") is embedded with `bge-m3` and the closest provisions are found in Vectorize. Weak matches are dropped (similarity below 0.5, or more than 0.1 below the best match).
3. **Context:** up to 5 provisions (about 7,000 characters) are sent to Groq with rules: use them as the primary source, cite them as `[1]`, `[2]`, never invent laws or sections, and say so when the sources are not enough.
4. **Answer:** "What the law says" (with citations) and "In simple words", in the language of the question.
5. **Citation check:** any Section/Article in the answer that was not among the retrieved sources is listed under the answer as "please verify".

The sources used are shown under every chat answer, with the official text and a link to Pakistan Code.

**Setup (once per Cloudflare account)**

```bash
npx wrangler login
npm run rag:index     # create the "paklegal-laws" Vectorize index
npm run rag:ingest    # embed and upload knowledge/chunks/*.json
```

**Adding a law**

1. Add an entry to `src/lib/rag/laws.ts` (name, PDF URL from Pakistan Code, English/Urdu names).
2. `npm run rag:build -- <law-id>` downloads the PDF and splits it into provisions (`knowledge/chunks/<law-id>.json`).
3. `npm run rag:ingest -- <law-id>` uploads it. No code changes are needed.

---

## Project Structure

```
src/
├── routes/           # Page components (TanStack file-based routing)
│   ├── index.tsx     # Home page
│   ├── chat.tsx      # Full-page Legal Chat
│   ├── translator.tsx
│   ├── fir.tsx
│   ├── bail.tsx
│   ├── notice.tsx
│   ├── complaint.tsx
│   └── rights.tsx
├── components/
│   ├── ChatWidget.tsx      # Floating chat bubble (all pages except /chat)
│   ├── LegalSources.tsx    # Sources list shown under chat answers
│   ├── SiteHeader.tsx
│   ├── PageShell.tsx
│   ├── DocumentResult.tsx  # Generated document with Copy / Print / Reset
│   └── MarkdownResult.tsx
├── lib/
│   ├── ai-functions.ts     # Server functions: Groq API calls + input validation
│   ├── rag/                # Legal knowledge base: laws registry, retrieval, citations
│   ├── document-actions.ts # Copy and print helpers
│   └── i18n.tsx            # Urdu/English language context
└── hooks/
    └── useLocalStorage.ts
knowledge/chunks/           # Law text split into Articles/Sections (built from official PDFs)
scripts/rag/                # build-knowledge.mjs, ingest.mjs
```

---

## AI Disclaimer

PakLegal AI provides **general legal information only** — not legal advice. It is not a substitute for a qualified lawyer. Always consult a licensed advocate for your specific case.

---

## License

MIT
