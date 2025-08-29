import type { NipPlugin, WSHelpers } from "@nostr-relay/types"
import { verifyEventSignature } from "../crypto"

type Session = { challenge?: string; authedPubkey?: string; issuedAt?: number }
const sessions = new WeakMap<WebSocket, Session>()

type Nip42Config = { requireAuthForPublish: boolean }

export const nip42Plugin: NipPlugin<Nip42Config> = {
  id: "nip-42",
  nip: 42,
  defaultConfig: { requireAuthForPublish: false },
  configSchema: {
    type: "object",
    properties: { requireAuthForPublish: { type: "boolean", title: "Require AUTH for publish", default: false } },
    required: []
  },
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
  const [type, payload] = msg
      const cfg = (await getConfig()) as Nip42Config
      if (type === "EVENT") {
        if (!cfg.requireAuthForPublish) return false
        const s = sessions.get(ws) || {}
        const ev = payload as any
        if (!s.authedPubkey) {
          const challenge = Math.random().toString(36).slice(2)
          sessions.set(ws, { ...s, challenge, issuedAt: Math.floor(Date.now() / 1000) })
          helpers.send(ws, ["AUTH", challenge])
          return true
        }
        if (ev?.pubkey && s.authedPubkey && ev.pubkey !== s.authedPubkey) {
          helpers.send(ws, ["OK", ev.id || "", false, "restricted:auth-pubkey-mismatch"])
          return true
        }
        return false
      }
      if (type === "AUTH") {
        // AUTH from client: payload is signed event
        const ev = payload as any
        const s = sessions.get(ws)
        if (!s?.challenge) {
          helpers.send(ws, ["OK", ev?.id || "", false, "restricted:no-challenge"])
          return true
        }
        // Verify event basics
        try {
          if (ev.kind !== 22242) { helpers.send(ws, ["OK", ev.id, false, "invalid:auth-kind"]); return true }
          const now = Math.floor(Date.now() / 1000)
          if (Math.abs(now - Number(ev.created_at || 0)) > 600) { helpers.send(ws, ["OK", ev.id, false, "invalid:stale-auth"]); return true }
          const challengeTag = ev.tags.find((t: string[]) => t[0] === "challenge")?.[1]
          if (challengeTag !== s.challenge) { helpers.send(ws, ["OK", ev.id, false, "invalid:challenge"]); return true }
          const relayTag = ev.tags.find((t: string[]) => t[0] === "relay")?.[1]
          const relayUrl = helpers.relayUrl
          if (!relayTag || (relayUrl && !relayTag.includes(new URL(relayUrl).host))) {
            helpers.send(ws, ["OK", ev.id, false, "invalid:relay"]); return true
          }
          // signature
          const ok = verifyEventSignature(ev)
          if (!ok) { helpers.send(ws, ["OK", ev.id, false, "invalid:bad-sig"]); return true }
          sessions.set(ws, { authedPubkey: ev.pubkey })
          helpers.send(ws, ["OK", ev.id, true, ""])
          return true
        } catch {
          helpers.send(ws, ["OK", ev?.id || "", false, "invalid:auth"])
          return true
        }
      }
      return false
    })
  }
}

export default nip42Plugin
