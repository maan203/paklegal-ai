// Cloudflare's runtime module; its bindings are typed where they are used (src/lib/rag/cloudflare.ts).
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
