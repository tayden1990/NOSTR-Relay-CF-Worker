import type { NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"
import { EventStore } from "../event-store"

type Nip09Config = { allowDeletes: boolean }

export const nip09Plugin: NipPlugin<Nip09Config> = {
  id: "nip-09",
  nip: 9,
  defaultConfig: { allowDeletes: true },
  configSchema: {
    type: "object",
    properties: { 
      allowDeletes: { 
        type: "boolean", 
        title: "Allow deletion requests", 
        default: true,
        description: "Enables NIP-09 event deletion. When enabled, users can delete their own events by publishing kind 5 events. Useful for content moderation and user privacy, but some relays disable this to maintain historical records."
      } 
    },
    required: []
  },
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ...rest] = msg
      if (type !== "EVENT") return false
      const ev = rest[0] as NostrEvent
      if (ev.kind !== 5) return false
      const cfg = (await getConfig()) as Nip09Config
      if (!cfg.allowDeletes) {
        helpers.send(ws, ["OK", ev.id, false, "blocked:deletes-disabled"])
        return true
      }
      const ids = ev.tags.filter(t => t[0] === 'e').map(t => t[1])
      EventStore.delete(ids)
      helpers.send(ws, ["OK", ev.id, true, ""])
      return true
    })
  }
}

export default nip09Plugin
