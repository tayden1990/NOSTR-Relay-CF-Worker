import { describe, it, expect } from 'vitest'
import { getEventHash, verifyEventSignature } from '../src/crypto'
import { schnorr } from '@noble/curves/secp256k1'

describe('NIP-01 crypto', () => {
  it('computes id and verifies Schnorr signature', async () => {
  const sk = schnorr.utils.randomPrivateKey()
  const pk = schnorr.getPublicKey(sk)
    const pubhex = Buffer.from(pk).toString('hex')
    const ev: any = { pubkey: pubhex, created_at: Math.floor(Date.now()/1000), kind: 1, tags: [], content: 'hello' }
    ev.id = getEventHash(ev)
    const msg = Buffer.from(ev.id, 'hex')
    const sig = await schnorr.sign(msg, sk)
    ev.sig = Buffer.from(sig).toString('hex')
    expect(verifyEventSignature(ev)).toBe(true)
  })
})
