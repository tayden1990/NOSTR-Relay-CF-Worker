import type { JsonSchema, NipPlugin } from "@nostr-relay/types"

type Nip22Config = { enabled: boolean }

export const nip22Plugin: NipPlugin<Nip22Config> = {
  id: "nip-22",
  nip: 22,
  defaultConfig: { enabled: true },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-22 (stub)", default: true }
    }
  } satisfies JsonSchema,
  setup: () => { /* no-op for now; extend per spec */ }
}

export default nip22Plugin
