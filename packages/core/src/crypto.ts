import { sha256 } from "@noble/hashes/sha256"
import { schnorr } from "@noble/curves/secp256k1"

export type EventLike = {
  id?: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig?: string
}

export function serializeEvent(e: EventLike): string {
  // Per NIP-01: [0, pubkey, created_at, kind, tags, content]
  return JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content])
}

export function getEventHash(e: EventLike): string {
  const ser = serializeEvent(e)
  const h = sha256(new TextEncoder().encode(ser))
  return bytesToHex(h)
}

export function bytesToHex(b: Uint8Array): string {
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("")
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex")
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function verifyEventSignature(e: EventLike): boolean {
  if (!e.sig) return false
  try {
    const msg = hexToBytes(getEventHash(e))
    const sig = hexToBytes(e.sig)
    const pub = e.pubkey
    return schnorr.verify(sig, msg, pub)
  } catch {
    return false
  }
}
