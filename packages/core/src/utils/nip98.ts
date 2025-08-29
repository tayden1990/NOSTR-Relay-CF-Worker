import { type EventLike } from "../crypto"

export type Nip98Template = {
  kind: 27235
  created_at: number
  pubkey: string
  content: string
  tags: Array<[string, ...string[]]>
}

export function createNip98Template(url: string, method: string, pubkey: string, createdAt?: number, payloadSHA256Hex?: string): Nip98Template {
  const tags: Array<[string, ...string[]]> = [["u", url], ["method", method.toUpperCase()]]
  if (payloadSHA256Hex) tags.push(["payload", payloadSHA256Hex])
  return { kind: 27235, pubkey, created_at: createdAt ?? Math.floor(Date.now() / 1000), content: "", tags }
}

export function toAuthorizationHeader(signedEvent: EventLike): string {
  // Per NIP-98: send as base64-encoded JSON in Authorization: Nostr <token>
  const json = JSON.stringify(signedEvent)
  const b64 = btoa(unescape(encodeURIComponent(json)))
  return `Nostr ${b64}`
}
