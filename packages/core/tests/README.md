These are lightweight tests you can run manually with `ts-node` or your preferred runner.

Included:
- nip01-verify.ts: builds a deterministic event, computes id, and verifies signature failure (no real key signing in this smoke test)
- d1-buildQuery.ts: validates SQL/params generated for a few filters
- nip42-auth-flow.md: describes a short AUTH exchange to simulate
- rate-limit-sim.ts: simulates per-connection throttling by calling the handler repeatedly
