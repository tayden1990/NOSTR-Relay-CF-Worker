# NIP-42 AUTH flow (manual)

1. Client sends EVENT but server requires auth → server sends ["AUTH", "<challenge>"]
2. Client sends AUTH event (kind 22242) with tags:
   - ["relay", "wss://<host>/ws"]
   - ["challenge", "<challenge>"]
   - created_at within ±10 minutes
   - valid signature
3. Server replies ["OK", <id>, true, ""], sets session pubkey.
4. Subsequent EVENT with a different pubkey → server replies ["OK", <id>, false, "restricted:auth-pubkey-mismatch"].
