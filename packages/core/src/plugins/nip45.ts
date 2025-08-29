import type { NipPlugin, WSHelpers } from "@nostr-relay/types"
import { EventStore } from "../event-store"

function matches(ev: any, f: any): boolean {
  if (f.kinds && Array.isArray(f.kinds) && !f.kinds.includes(ev.kind)) return false
  if (f.authors && Array.isArray(f.authors) && !f.authors.includes(ev.pubkey)) return false
  if (f.ids && Array.isArray(f.ids) && !f.ids.includes(ev.id)) return false
  return true
}

export const nip45Plugin: NipPlugin<{ enabled: boolean }> = {
  id: "nip-45",
  nip: 45,
  defaultConfig: { enabled: true },
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ...rest] = msg
      if (type !== "COUNT") return false
      const cfg = (await getConfig()) as { enabled: boolean }
      if (!cfg.enabled) return true
  const [subId, filter] = rest as [string, any]
  const events = await EventStore.query([filter || {}])
  const c = events.length
      helpers.send(ws, ["COUNT", subId, { count: c }])
      return true
    })
  }
}

export default nip45Plugin
