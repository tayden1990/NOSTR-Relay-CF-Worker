import type { EnvBindings, JsonSchema, NipPlugin, RelayInfo } from "@nostr-relay/types"

type Nip11Config = RelayInfo

export const nip11Plugin: NipPlugin<Nip11Config> = {
  id: "nip-11",
  nip: 11,
  defaultConfig: {
    name: "My Nostr Relay",
    description: "A modular relay",
    software: "nostr-relay-cf-worker",
    version: "0.0.1",
    supported_nips: [11]
  },
  configSchema: {
    type: "object",
    properties: {
      name: { type: "string", title: "Name" },
      description: { type: "string", title: "Description" },
      pubkey: { type: "string", title: "Pubkey" },
      contact: { type: "string", title: "Contact" },
      software: { type: "string", title: "Software" },
      version: { type: "string", title: "Version" },
      payments_url: { type: "string", title: "Payments URL" },
      supported_nips: { type: "array", title: "Supported NIPs", items: { type: "number" } }
    },
    required: ["name", "description"]
  } satisfies JsonSchema,
  setup() {},
  fetch: async (req, env: EnvBindings) => {
    const url = new URL(req.url)
    if (url.pathname === "/" || url.pathname === "/.well-known/nostr.json") {
      // not NIP-11
      return undefined
    }
    if (url.pathname === "/") return undefined
    // Reserve path for future expansion
    return undefined
  }
}

export default nip11Plugin
