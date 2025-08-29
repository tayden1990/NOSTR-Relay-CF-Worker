import { describe, it, expect } from 'vitest'
import { schnorr } from '@noble/curves/secp256k1'
import { getEventHash } from '../src/crypto'
import { nip42Plugin } from '../src/plugins/nip42'

function makeHandlers(cfg: any) {
  let handler: any
  const sent: any[] = []
  const ctx: any = {
    registerWSMessageHandler: (h: any) => { handler = h },
    getConfig: async () => cfg
  }
  nip42Plugin.setup(ctx as any, cfg)
  const ws = {} as any
  const helpers: any = { send: (_ws: any, d: any) => sent.push(d), broadcast: () => {}, relayUrl: 'wss://relay.example/ws' }
  return { handler: async (m: any) => handler(ws, m, helpers), sent }
}

describe('NIP-42 AUTH flow', () => {
  it('challenges then accepts valid AUTH and enforces pubkey', async () => {
    const { handler, sent } = makeHandlers({ requireAuthForPublish: true })
    const sk = schnorr.utils.randomPrivateKey(); const pk = await schnorr.getPublicKey(sk)
    const pubhex = Buffer.from(pk).toString('hex')
    // initial publish triggers challenge
    await handler(["EVENT", { id: 'x', pubkey: pubhex, kind: 1, created_at: 1, tags: [], content: '' }])
    const authMsg = sent.find(x => Array.isArray(x) && x[0] === 'AUTH')
    expect(authMsg).toBeTruthy()
    const challenge = authMsg[1]
    // build AUTH event
    const authEv: any = { pubkey: pubhex, created_at: Math.floor(Date.now()/1000), kind: 22242, tags: [["relay","wss://relay.example/ws"],["challenge", challenge]], content: '' }
    authEv.id = getEventHash(authEv)
    const sig = await schnorr.sign(Buffer.from(authEv.id, 'hex'), sk)
    authEv.sig = Buffer.from(sig).toString('hex')
    await handler(["AUTH", authEv])
    const ok = sent.find(x => Array.isArray(x) && x[0] === 'OK' && x[2] === true)
    expect(ok).toBeTruthy()
    // mismatch pubkey
    await handler(["EVENT", { id: 'y', pubkey: '00'.repeat(32), kind: 1, created_at: 1, tags: [], content: '' }])
    const denied = sent.find(x => Array.isArray(x) && x[0] === 'OK' && x[2] === false && x[3].includes('auth-pubkey-mismatch'))
    expect(denied).toBeTruthy()
  })
})
