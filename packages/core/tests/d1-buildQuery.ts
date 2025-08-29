import { D1Backend } from "../src/event-store"

const cases = [
  [{ kinds: [1], limit: 10 }],
  [{ authors: ["abcdef"], since: 100, until: 200 }],
  [{ ids: ["deadbeef"], "#e": ["ref1", "ref2"] }]
]

for (const f of cases) {
  const built = D1Backend.buildQuery(f as any)
  for (const q of built) {
    console.log(q.sql)
    console.log(JSON.stringify(q.params))
  }
}
