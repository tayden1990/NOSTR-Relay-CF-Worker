import { describe, it, expect } from 'vitest'
import { PluginManager, MemoryConfigStorage, nip42Plugin } from '../src'
import type { WSHelpers } from '@nostr-relay/types'
import { schnorr } from '@noble/curves/secp256k1'
import { getEventHash } from '../src/crypto'

describe('WS harness AUTH flow', () => {
  it('AUTH challenge→success→publish enforcement', async () => {
    const storage = new MemoryConfigStorage()
  // Enable AUTH requirement for publish
  await (storage as any).setPluginConfig('nip-42', { requireAuthForPublish: true })
  const pm = new PluginManager(storage as any, () => {})
    pm.register(nip42Plugin)
    await pm.setupAll({} as any)

    const sent: any[] = []
    const ws = {} as any
    const helpers: WSHelpers = { send: (_ws, d) => sent.push(d), broadcast: () => {}, relayUrl: 'wss://relay.example/ws' }

    const sk = schnorr.utils.randomPrivateKey(); const pk = schnorr.getPublicKey(sk)
    const pubhex = Buffer.from(pk).toString('hex')

    // Send EVENT before auth to trigger challenge
    await pm.onWSMessage(ws, ["EVENT", { id: 'x', pubkey: pubhex, kind: 1, created_at: 1, tags: [], content: '' }], helpers)
    const authMsg = sent.find(x => Array.isArray(x) && x[0] === 'AUTH')
    expect(authMsg).toBeTruthy()
    const challenge = authMsg[1]

    // Complete AUTH
    const ev: any = { pubkey: pubhex, kind: 22242, created_at: Math.floor(Date.now()/1000), tags: [["relay","wss://relay.example/ws"],["challenge", challenge]], content: '' }
    ev.id = getEventHash(ev)
    const sig = await schnorr.sign(Buffer.from(ev.id, 'hex'), sk)
    ev.sig = Buffer.from(sig).toString('hex')
    await pm.onWSMessage(ws, ["AUTH", ev], helpers)
    const ok = sent.find(x => Array.isArray(x) && x[0] === 'OK' && x[2] === true)
    expect(ok).toBeTruthy()
  })
})
