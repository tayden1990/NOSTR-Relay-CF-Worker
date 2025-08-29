import type { JsonSchema, NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"

type NipEEConfig = {
  enabled: boolean
  allowKeyPackages: boolean // kind 443
  allowWelcome: boolean // kind 444 (should be unsigned per NIP-59 when wrapped; we don't enforce here)
  allowGroupEvents: boolean // kind 445
  allowedRelays: string[] // optional relay allowlist referenced in tags
}

export const nipEEPlugin: NipPlugin<NipEEConfig> = {
  id: "nip-ee",
  nip: 445, // advertise by main Group Event kind
  defaultConfig: {
    enabled: true,
    allowKeyPackages: true,
    allowWelcome: true,
    allowGroupEvents: true,
    allowedRelays: []
  },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-EE", default: true },
      allowKeyPackages: { type: "boolean", title: "Accept KeyPackage events (443)", default: true },
      allowWelcome: { type: "boolean", title: "Accept Welcome events (444)", default: true },
      allowGroupEvents: { type: "boolean", title: "Accept Group events (445)", default: true },
      allowedRelays: { type: "array", title: "Allowed relays (empty = any)", items: { type: "string" } }
    }
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, evRaw] = msg
      if (type !== "EVENT") return false
      const ev = evRaw as NostrEvent
      const cfg = (await getConfig()) as NipEEConfig
      if (!cfg.enabled) return false

      if (![443, 444, 445].includes(ev.kind)) return false
      if (ev.kind === 443 && !cfg.allowKeyPackages) { helpers.send(ws, ["OK", ev.id, false, "nip-ee:blocked:443"]); return true }
      if (ev.kind === 444 && !cfg.allowWelcome) { helpers.send(ws, ["OK", ev.id, false, "nip-ee:blocked:444"]); return true }
      if (ev.kind === 445 && !cfg.allowGroupEvents) { helpers.send(ws, ["OK", ev.id, false, "nip-ee:blocked:445"]); return true }

      // Optional relay allowlist check (look for "relays" tag if present)
      if (cfg.allowedRelays.length > 0) {
        const relays = ev.tags.filter(t => t[0] === "relays").flatMap(t => t.slice(1))
        if (relays.length > 0 && !relays.some(r => cfg.allowedRelays.includes(r))) {
          helpers.send(ws, ["OK", ev.id, false, "nip-ee:relay-not-allowed"]) ; return true
        }
      }
      // Accept and let base NIP-01 store it
      return false
    })
  }
}

export default nipEEPlugin
