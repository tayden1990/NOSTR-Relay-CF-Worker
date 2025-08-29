import type { JsonSchema, NipPlugin } from "@nostr-relay/types"

type Nip05Config = {
  enabled: boolean
  names: Record<string, string> // name -> pubkey hex
  relays?: Record<string, string[]> // pubkey -> relay urls
}

export const nip05Plugin: NipPlugin<Nip05Config> = {
  id: "nip-05",
  nip: 5,
  defaultConfig: { enabled: true, names: {}, relays: {} },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-05 mapping", default: true },
      // Use stringified JSON for complex maps (UI shows textarea)
      names: { type: "string", title: "names JSON (name->pubkey)", default: "{}" },
      relays: { type: "string", title: "relays JSON (pubkey->urls[])", default: "{}" }
    }
  } satisfies JsonSchema,
  setup: () => { /* no-op: worker serves well-known using this config */ }
}

export default nip05Plugin
