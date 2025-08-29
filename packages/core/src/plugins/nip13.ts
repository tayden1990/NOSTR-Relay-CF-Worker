import type { NipPlugin, NostrEvent, WSHelpers, JsonSchema } from "@nostr-relay/types"

type Nip13Config = { minDifficulty: number }

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || [])
}

function leadingZeroBits(bytes: Uint8Array): number {
  let bits = 0
  for (const b of bytes) {
    if (b === 0) { bits += 8; continue }
    let n = 0
    for (let i = 7; i >= 0; i--) { if ((b & (1 << i)) === 0) n++; else break }
    bits += n
    break
  }
  return bits
}

export const nip13Plugin: NipPlugin<Nip13Config> = {
  id: "nip-13",
  nip: 13,
  defaultConfig: { minDifficulty: 0 },
  configSchema: {
    type: "object",
    properties: { minDifficulty: { type: "number", title: "Minimum PoW difficulty", default: 0, minimum: 0, maximum: 256 } },
    required: []
  },
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, ...rest] = msg
      if (type !== "EVENT") return false
      const ev = rest[0] as NostrEvent
      const cfg = (await getConfig()) as Nip13Config
      if (cfg.minDifficulty && cfg.minDifficulty > 0) {
        const bits = leadingZeroBits(hexToBytes(ev.id))
        if (bits < cfg.minDifficulty) {
          helpers.send(ws, ["OK", ev.id, false, `pow:${bits}<${cfg.minDifficulty}`])
          return true
        }
      }
      return false
    })
  }
}

export default nip13Plugin
