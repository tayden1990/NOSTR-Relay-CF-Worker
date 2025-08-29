import type { NipPlugin, NostrEvent, WSHelpers, JsonSchema } from "@nostr-relay/types"

type Nip40Config = { rejectExpired: boolean }

export const nip40Plugin: NipPlugin<Nip40Config> = {
  id: "nip-40",
  nip: 40,
  defaultConfig: { rejectExpired: true },
  configSchema: {
    type: "object",
    properties: { rejectExpired: { type: "boolean", title: "Reject expired events", default: true } },
    required: []
  },
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ...rest] = msg
      if (type !== "EVENT") return false
      const ev = rest[0] as NostrEvent
      const exp = ev.tags.find(t => t[0] === 'expiration')?.[1]
      if (!exp) return false
      const cfg = (await getConfig()) as Nip40Config
      const now = Math.floor(Date.now() / 1000)
      if (cfg.rejectExpired && Number(exp) < now) {
        helpers.send(ws, ["OK", ev.id, false, "expired"])
        return true
      }
      return false
    })
  }
}

export default nip40Plugin
