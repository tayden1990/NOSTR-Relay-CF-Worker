import { rateLimitPlugin } from "../src/plugins/rate-limit"
import type { WSHelpers } from "@nostr-relay/types"

const messages: any[] = []
const helpers: WSHelpers = {
  send: (_ws, d) => messages.push(d),
  broadcast: () => {}
}

const ws = new WebSocket("ws://example")
const setupCtx: any = {
  registerWSMessageHandler: (h: any) => {
    // spam 100 EVENTs quickly
    ;(async () => {
      for (let i = 0; i < 100; i++) await h(ws, ["EVENT", { kind: 1, id: String(i), pubkey: "pk", created_at: i, tags: [], content: "x" }], helpers)
      console.log("out messages:", messages.slice(-3))
    })()
  },
  getConfig: async () => ({ enabled: true, eventsPerMinute: 10, burst: 5, blockSeconds: 1 })
}

rateLimitPlugin.setup(setupCtx as any, {} as any)
