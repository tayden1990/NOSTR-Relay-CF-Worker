import { describe, it, expect } from 'vitest'
import { rateLimitPlugin } from '../src/plugins/rate-limit'

function makeHandlers(cfg: any) {
  let handler: any
  const sent: any[] = []
  const ctx: any = {
    registerWSMessageHandler: (h: any) => { handler = h },
    getConfig: async () => cfg
  }
  rateLimitPlugin.setup(ctx as any, cfg)
  const ws = {} as any
  const helpers: any = { send: (_ws: any, d: any) => sent.push(d), broadcast: () => {} }
  return { handler: async (m: any) => handler(ws, m, helpers), sent }
}

describe('rate-limit', () => {
  it('limits burst of EVENTs', async () => {
    const { handler, sent } = makeHandlers({ enabled: true, eventsPerMinute: 2, burst: 1, blockSeconds: 1 })
    for (let i=0;i<10;i++) await handler(["EVENT", { id: String(i), pubkey: 'pk', kind: 1, created_at: i, tags: [], content: '' }])
    const notice = sent.find(x => Array.isArray(x) && x[0] === 'NOTICE' && x[1] === 'rate-limited')
    expect(notice).toBeTruthy()
  })
})
