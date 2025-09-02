import type { NipPlugin, NostrEvent, WSHelpers, JsonSchema } from "@nostr-relay/types"
import { EventStore } from "../event-store"
import { getEventHash, verifyEventSignature } from "../crypto"

type Nip01Config = {
  maxEventSizeBytes: number
  allowKinds: number[] | null
  blockPubkeys: string[]
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
      maxEventSizeBytes: { 
        type: "number", 
        title: "Max event size (bytes)", 
        default: 100000,
        description: "Maximum size in bytes for individual events (NIP-01). Recommended: 100KB for general use, 65KB for resource-constrained relays, 1MB for media-heavy relays. Larger events consume more bandwidth and storage."
      },
      allowKinds: { 
        type: "array", 
        title: "Allowed event kinds", 
        items: { type: "number" },
        description: "Whitelist of event kinds to accept (empty = accept all). Common kinds: 0=user metadata, 1=text notes, 3=contacts, 4=encrypted DMs, 5=event deletion, 6=reposts, 7=reactions. Use to create specialized relays (e.g., [0,1,7] for social posts only)."
      },
      blockPubkeys: { 
        type: "array", 
        title: "Blocked public keys", 
        items: { type: "string" },
        description: "List of 64-character hex public keys to block from posting. Use for spam prevention and content moderation. Example: 'abcd1234efgh5678...' (32 bytes hex encoded)."
      }
    },
    required: ["maxEventSizeBytes"]
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
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
