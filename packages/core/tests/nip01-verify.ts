import { getEventHash, verifyEventSignature } from "../src/crypto"

const ev = {
  pubkey: "00".repeat(32),
  created_at: 1,
  kind: 1,
  tags: [],
  content: "hello",
} as any

// compute id
const id = getEventHash(ev)
;(ev as any).id = id
// no signature
;(ev as any).sig = ""

console.log("id:", id)
console.log("sig ok:", verifyEventSignature(ev))
