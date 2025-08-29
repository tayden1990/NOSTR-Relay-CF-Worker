import { describe, it, expect } from 'vitest'
import { nip22Plugin } from '../src/plugins/nip22'

function makeHandlers(cfg: any) {
  let handler: any
  const sent: any[] = []
  const ctx: any = {
    registerWSMessageHandler: (h: any) => { handler = h },
    getConfig: async () => cfg
  }
  nip22Plugin.setup(ctx as any, cfg)
  const ws = {} as any
  const helpers: any = { send: (_ws: any, d: any) => sent.push(d), broadcast: () => {} }
  return { handler: async (m: any) => handler(ws, m, helpers), sent }
}

describe('nip-22 moderation', () => {
  it('rejects reactions without target refs when required', async () => {
    const { handler, sent } = makeHandlers({ enabled: true, allowReplaceableKinds: true, requireTargetForReactions: true })
    await handler(["EVENT", { id: '1', pubkey: 'pk', kind: 7, created_at: 1, tags: [], content: '+' }])
    const deny = sent.find(x => Array.isArray(x) && x[0] === 'OK' && x[2] === false && x[3].includes('nip22-reaction'))
    expect(deny).toBeTruthy()
  })
  it('rejects replaceable kinds when disabled', async () => {
    const { handler, sent } = makeHandlers({ enabled: true, allowReplaceableKinds: false, requireTargetForReactions: false })
    await handler(["EVENT", { id: '2', pubkey: 'pk', kind: 30001, created_at: 1, tags: [], content: '' }])
    const deny = sent.find(x => Array.isArray(x) && x[0] === 'OK' && x[2] === false && x[3].includes('nip22-replaceable'))
    expect(deny).toBeTruthy()
  })
})
