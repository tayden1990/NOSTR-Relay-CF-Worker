import { schnorr } from '@noble/curves/secp256k1'
import { getEventHash } from '../../src/crypto'

export function generateKeyPairHex() {
  const sk = schnorr.utils.randomPrivateKey()
  const pk = schnorr.getPublicKey(sk)
  const skHex = Buffer.from(sk).toString('hex')
  const pkHex = Buffer.from(pk).toString('hex')
  return { skHex, pkHex, sk, pk }
}

export async function signEvent(ev: any, sk: Uint8Array) {
  ev.id = getEventHash(ev)
  const sig = await schnorr.sign(Buffer.from(ev.id, 'hex'), sk)
  ev.sig = Buffer.from(sig).toString('hex')
  return ev
}
