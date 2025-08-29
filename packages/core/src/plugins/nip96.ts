import type { JsonSchema, NipPlugin } from "@nostr-relay/types"

type Nip96Config = {
  enabled: boolean
  mode: "delegate" | "builtin" | "disabled"
  api_url: string
  download_url?: string
  delegated_to_url?: string
  supported_nips?: number[]
  tos_url?: string
  content_types?: string[]
  plans?: Record<string, unknown>
}

export const nip96Plugin: NipPlugin<Nip96Config> = {
  id: "nip-96",
  nip: 96,
  defaultConfig: {
    enabled: true,
    mode: "delegate",
    api_url: "",
    download_url: "",
    delegated_to_url: "",
    supported_nips: [96],
    content_types: ["image/*", "video/*", "audio/*"]
  },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-96", default: true },
      mode: { type: "string", title: "Mode", enum: ["delegate", "builtin", "disabled"] },
      api_url: { type: "string", title: "API URL" },
      download_url: { type: "string", title: "Download URL" },
      delegated_to_url: { type: "string", title: "Delegated To URL" },
      tos_url: { type: "string", title: "Terms of Service URL" },
      supported_nips: { type: "array", title: "Supported NIPs", items: { type: "number" } },
      content_types: { type: "array", title: "Content Types", items: { type: "string" } }
    }
  } satisfies JsonSchema,
  setup() {},
  fetch: async (req: Request) => {
    const url = new URL(req.url)
    if (url.pathname === "/.well-known/nostr/nip96.json") {
      // Serve discovery document from config stored in relay config (plugins.nip-96)
      // The worker will have persisted config via storage; but here we cannot access it.
      // This plugin only responds if ADMIN provided static env-based JSON via variables.
      // As a scaffold, return a minimal document indicating delegation or disabled.
      const body = {
        api_url: "",
        download_url: "",
        delegated_to_url: "",
        supported_nips: [96],
        content_types: ["image/*", "video/*", "audio/*"]
      }
      return new Response(JSON.stringify(body), { headers: { "content-type": "application/json; charset=utf-8" } })
    }
    // Upload/Download are out-of-scope for this relay; use a separate HTTP file server.
    return undefined
  }
}

export default nip96Plugin
