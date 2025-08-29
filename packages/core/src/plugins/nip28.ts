import type { JsonSchema, NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"

type Nip28Config = {
  enabled: boolean
  requireChannelRefForMessages: boolean
}

export const nip28Plugin: NipPlugin<Nip28Config> = {
  id: "nip-28",
  nip: 28,
  defaultConfig: { enabled: true, requireChannelRefForMessages: true },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-28 checks", default: true },
      requireChannelRefForMessages: { type: "boolean", title: "Require channel reference tag on kind 42", default: true }
    }
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ev] = msg
      if (type !== "EVENT") return false
      const e = ev as NostrEvent
      const cfg = (await getConfig()) as Nip28Config
      if (!cfg.enabled) return false
      // Only minimally validate channel messages (kind 42)
      if (e.kind === 42 && cfg.requireChannelRefForMessages) {
        const hasChannel = e.tags.some(t => t[0] === "e" || t[0] === "a")
        if (!hasChannel) { helpers.send(ws, ["OK", e.id, false, "invalid:nip28-missing-channel"]); return true }
      }
      return false
    })
  }
}

export default nip28Plugin
