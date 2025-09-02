import type { JsonSchema, NipPlugin, WSHelpers } from "@nostr-relay/types"

type RateLimitConfig = {
  enabled: boolean
  eventsPerMinute: number
  burst: number
  blockSeconds: number
}

const state = new WeakMap<WebSocket, { times: number[]; blockedUntil?: number }>()

export const rateLimitPlugin: NipPlugin<RateLimitConfig> = {
  id: "rate-limit",
  nip: 0, // not a NIP; utility plugin (won't be advertised)
  defaultConfig: { enabled: true, eventsPerMinute: 60, burst: 30, blockSeconds: 10 },
  configSchema: {
    type: "object",
    properties: {
      enabled: { 
        type: "boolean", 
        title: "Enable rate limiting", 
        default: true,
        description: "Protects your relay from spam and abuse by limiting how fast users can post events. Essential for public relays to prevent resource exhaustion and maintain service quality."
      },
      eventsPerMinute: { 
        type: "number", 
        title: "Events per minute limit", 
        default: 60, 
        minimum: 1,
        description: "Maximum events a user can post per minute under normal conditions. Recommended: 60 for general use, 30 for conservative, 120 for high-activity communities. Higher values allow more activity but increase spam risk."
      },
      burst: { 
        type: "number", 
        title: "Burst allowance", 
        default: 30, 
        minimum: 1,
        description: "Additional events allowed in short bursts beyond the per-minute rate. Helps legitimate users who post several related events quickly. Should be 25-50% of the per-minute limit."
      },
      blockSeconds: { 
        type: "number", 
        title: "Block duration (seconds)", 
        default: 10, 
        minimum: 0,
        description: "How long to block a user after they exceed the rate limit. Recommended: 10-60 seconds. Longer blocks reduce spam effectiveness but may frustrate legitimate users."
      }
    },
    required: ["eventsPerMinute"]
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type] = msg
      if (type !== "EVENT") return false
      const cfg = (await getConfig()) as RateLimitConfig
      if (!cfg.enabled) return false
      const now = Date.now()
      const s = state.get(ws) || { times: [] }
      if (s.blockedUntil && now < s.blockedUntil) {
        helpers.send(ws, ["NOTICE", "rate-limited"])
        return true
      }
      // prune older than 60s
      const cutoff = now - 60_000
      s.times = s.times.filter(t => t >= cutoff)
      s.times.push(now)
      const limit = cfg.eventsPerMinute + cfg.burst
      if (s.times.length > limit) {
        s.blockedUntil = now + cfg.blockSeconds * 1000
        state.set(ws, s)
        helpers.send(ws, ["NOTICE", "rate-limited"])
        return true
      }
      state.set(ws, s)
      return false
    })
  }
}

export default rateLimitPlugin
