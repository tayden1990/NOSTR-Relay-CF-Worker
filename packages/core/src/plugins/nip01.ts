import type { NipPlugin, NostrEvent, WSHelpers, JsonSchema } from "@nostr-relay/types"
import { EventStore } from "../event-store"
import { getEventHash, verifyEventSignature } from "../crypto"

type Nip01Config = {
  maxEventSizeBytes: number
  allowKinds: number[] | null
  blockPubkeys: string[]
}

function matchesFilter(ev: NostrEvent, f: any): boolean {
  if (f.ids && Array.isArray(f.ids)) {
    if (!f.ids.some((id: string) => ev.id.startsWith(id))) return false
  }
  if (f.kinds && Array.isArray(f.kinds)) {
    if (!f.kinds.includes(ev.kind)) return false
  }
  if (f.authors && Array.isArray(f.authors)) {
    if (!f.authors.some((a: string) => ev.pubkey.startsWith(a))) return false
  }
  if (f.since && typeof f.since === 'number') {
    if (ev.created_at < f.since) return false
  }
  if (f.until && typeof f.until === 'number') {
    if (ev.created_at > f.until) return false
  }
  if (f.limit && typeof f.limit === 'number') {
    // limit applied by caller, not here
  }
  // tags
  for (const [k, vals] of Object.entries(f)) {
    if (k.length === 1 && Array.isArray(vals)) {
      const tagVals = ev.tags.filter(t => t[0] === k).map(t => t[1])
      if (!vals.some((v: string) => tagVals.includes(v))) return false
    }
  }
  return true
}

export const nip01Plugin: NipPlugin<Nip01Config> = {
  id: "nip-01",
  nip: 1,
  defaultConfig: {
    maxEventSizeBytes: 100_000,
    allowKinds: null,
    blockPubkeys: []
  },
  configSchema: {
    type: "object",
    properties: {
      maxEventSizeBytes: { type: "number", title: "Max event size (bytes)", default: 100000 },
      allowKinds: { type: "array", title: "Allowed kinds (empty = all)", items: { type: "number" } },
      blockPubkeys: { type: "array", title: "Blocked pubkeys", items: { type: "string" } }
    },
    required: ["maxEventSizeBytes"]
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig, log }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ...rest] = msg
      if (type === "EVENT") {
        const ev = rest[0] as NostrEvent
        const cfg = (await getConfig()) as Nip01Config
        if (cfg.blockPubkeys.includes(ev.pubkey)) {
          helpers.send(ws, ["OK", ev.id, false, "blocked:pubkey"])
          return true
        }
        if (cfg.allowKinds && !cfg.allowKinds.includes(ev.kind)) {
          helpers.send(ws, ["OK", ev.id, false, "blocked:kind"])
          return true
        }
        const size = new Blob([JSON.stringify(ev)]).size
        if (size > cfg.maxEventSizeBytes) {
          helpers.send(ws, ["OK", ev.id, false, "blocked:size"])
          return true
        }
        // NIP-01 validation: id and signature
        const computed = getEventHash(ev)
        if (computed !== ev.id) {
          helpers.send(ws, ["OK", ev.id || computed, false, "invalid:id-mismatch"])
          return true
        }
        if (!verifyEventSignature(ev)) {
          helpers.send(ws, ["OK", ev.id, false, "invalid:bad-sig"])
          return true
        }
        await EventStore.add({ ...ev })
        helpers.send(ws, ["OK", ev.id, true, ""])
        return true
      }
      if (type === "REQ") {
        const subId = rest[0] as string
        const filters = rest.slice(1) as any[]
        const out = await EventStore.query(filters)
        for (const e of out) helpers.send(ws, ["EVENT", subId, e])
        helpers.send(ws, ["EOSE", subId])
        return true
      }
      if (type === "CLOSE") {
        const [subId] = rest as [string]
        helpers.send(ws, ["CLOSED", subId, "closed by client"]) // stateless stub
        return true
      }
      return false
    })
  }
}

export default nip01Plugin
