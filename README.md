# Nostr Relay CF Worker (Modular, NIP-pluggable)

This monorepo scaffolds a modular Nostr Relay built for Cloudflare Workers, with a plugin system to gradually add NIPs and an Admin UI to manage all configs.

## Packages
- packages/types: shared types and JSON-schema subset for admin forms
- packages/core: plugin manager, config storage, and built-in NIP-11 plugin
- apps/relay-worker: Cloudflare Worker implementing the relay HTTP+WS and admin API
- apps/admin-ui: React admin app to view/edit relay and plugin configs

## Quick start

1) Install pnpm if needed, then install deps

2) Dev the worker

3) Dev the admin UI

## Deploy
Use Wrangler to deploy the worker, bind a KV namespace as CONFIG_KV, and set ADMIN_KEY.

### GitHub Actions
1) Add repository secrets: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, ADMIN_KEY.
2) Push to main or run the workflow "Deploy Cloudflare Worker".
3) After deploy, find the worker URL in the Actions logs (typically https://<worker>.<account>.workers.dev). Share this URL with relay users. They can:
	- Connect via WebSocket: wss://<worker>.<account>.workers.dev
	- Get NIP-11 info: curl -H "Accept: application/nostr+json" https://<worker>.<account>.workers.dev
	- Admin API (if authorized): https://<worker>.<account>.workers.dev/admin/

## Roadmap
- Implement NIP-01 WS protocol handling
- Add plugins for NIP-05, NIP-22, NIP-28, etc.
- Persist events (D1 or external DB) and indexing
- Auth/rate limit plugins