# PakLegal AI

**Free AI-powered legal assistance for Pakistani citizens — in Urdu and English.**

PakLegal AI helps ordinary people understand court documents, draft FIRs, know their constitutional rights, and access the legal system without needing to hire a lawyer for every question.

---

## Features

| Tool | Description |
|------|-------------|
| 💬 **Legal Chat** | Ask any question about Pakistani law in plain Urdu or English |
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
- **AI:** NVIDIA NIM API — `meta/llama-3.3-70b-instruct`
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript
- **i18n:** Custom Urdu/English context with RTL support

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [NVIDIA NIM API key](https://build.nvidia.com/)

### Installation

```bash
git clone https://github.com/YOUR-USERNAME/paklegal-ai.git
cd paklegal-ai
npm install
```

### Environment Variables

Create a `.env.local` file in the root:

```env
NVIDIA_API_KEY=your_nvidia_nim_api_key_here
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

### Deploy to Cloudflare Workers

```bash
npm run deploy
```

---

## Project Structure

```
src/
├── routes/           # Page components (TanStack file-based routing)
│   ├── index.tsx     # Home page
│   ├── chat.tsx      # Legal Chat (also available as floating widget)
│   ├── translator.tsx
│   ├── fir.tsx
│   ├── bail.tsx
│   ├── notice.tsx
│   ├── complaint.tsx
│   └── rights.tsx
├── components/
│   ├── ChatWidget.tsx    # Floating chat button (visible on all pages)
│   ├── SiteHeader.tsx
│   ├── PageShell.tsx
│   └── MarkdownResult.tsx
├── lib/
│   ├── ai-functions.ts   # Server functions — NVIDIA NIM API calls
│   └── i18n.tsx          # Urdu/English language context
└── hooks/
    └── useLocalStorage.ts
```

---

## AI Disclaimer

PakLegal AI provides **general legal information only** — not legal advice. It is not a substitute for a qualified lawyer. Always consult a licensed advocate for your specific case.

---

## License

MIT
