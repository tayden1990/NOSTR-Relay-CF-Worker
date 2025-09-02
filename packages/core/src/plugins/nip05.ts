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
      enabled: { 
        type: "boolean", 
        title: "Enable NIP-05 identifier mapping", 
        default: true,
        description: "Enables DNS-based Nostr identifiers (user@domain.com format). Allows users to have human-readable addresses that map to their public keys via your domain's /.well-known/nostr.json endpoint."
      },
      // Use stringified JSON for complex maps (UI shows textarea)
      names: { 
        type: "string", 
        title: "Name to public key mappings (JSON)", 
        default: `{
  "alice": "npub1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d",
  "bob": "npub1z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4321098",
  "_": "npub1domain0wner1234567890abcdef1234567890abcdef1234567890abcdef"
}`,
        description: "JSON object mapping names to public keys. Use '_' for the root domain identifier (domain.com). Names should be lowercase alphanumeric with dots, dashes, underscores. Public keys in npub format or 64-char hex."
      },
      relays: { 
        type: "string", 
        title: "Public key to relay URLs (JSON)", 
        default: `{
  "npub1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d": ["wss://relay.domain.com", "wss://backup-relay.com"],
  "npub1z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4321098": ["wss://relay.domain.com"]
}`,
        description: "Optional relay hints for each public key. Helps clients discover where to find a user's events. Include your relay URL and optionally other reliable relays where the user posts."
      }
    }
  } satisfies JsonSchema,
  setup: () => { /* no-op: worker serves well-known using this config */ }
}

export default nip05Plugin
