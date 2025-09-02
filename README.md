# Nostr Relay CF Worker (Modular, NIP-pluggable)

This monorepo scaffolds a modular Nostr Relay built for Cloudflare Workers, with a plugin system to gradually add NIPs and a modern Admin UI to manage all configurations.

![Admin UI Screenshot](https://github.com/user-attachments/assets/dc22351f-d91f-4b9c-b8f5-a2373a75c050)

## Features

- 🔌 **Plugin Architecture**: Modular NIP implementations with easy extensibility
- 🎨 **Modern Admin UI**: Clean, responsive interface for configuration management
- ☁️ **Cloudflare Workers**: Serverless deployment with global edge distribution
- 🔐 **Secure Configuration**: Admin key authentication and input validation
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- ⚡ **Performance**: Fast loading and optimized bundle sizes
- 🧪 **Well Tested**: Comprehensive test suite with 100% pass rate

## Architecture

### Packages
- **packages/types**: Shared TypeScript types and JSON schema definitions
- **packages/core**: Plugin manager, config storage, crypto utilities, and built-in NIP plugins
- **apps/relay-worker**: Cloudflare Worker implementing the relay HTTP+WebSocket endpoints and admin API
- **apps/admin-ui**: React-based admin interface for viewing and editing relay/plugin configurations

### Supported NIPs
- NIP-01: Basic protocol flow description
- NIP-05: Mapping Nostr keys to DNS-based internet identifiers
- NIP-09: Event deletion
- NIP-11: Relay information document
- NIP-13: Proof of work
- NIP-22: Event created_at limits
- NIP-28: Public chat
- NIP-40: Expiration timestamp
- NIP-42: Authentication of clients to relays
- NIP-45: Counting results
- NIP-92: Media attachments
- NIP-94: File metadata
- NIP-96: HTTP file storage integration
- NIP-EE: Parameterized replaceable events
- Rate limiting plugin

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Cloudflare account (for deployment)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/tayden1990/NOSTR-Relay-CF-Worker.git
cd NOSTR-Relay-CF-Worker

# Install pnpm if you don't have it
npm install -g pnpm

# Install dependencies
pnpm install
```

### 2. Development

#### Start the relay worker (localhost:8787)
```bash
pnpm --filter relay-worker run dev
```

#### Start the admin UI (localhost:5173)
```bash
pnpm --filter nostr-relay-admin-ui run dev
```

### 3. Using the Admin UI

1. Open http://localhost:5173 in your browser
2. Enter your relay URL (default: http://localhost:8787)
3. Optionally enter an admin key for authentication
4. Click "Load Config" to fetch current configuration
5. Modify relay settings and plugin configurations as needed
6. Click "Save Config" to persist changes

### 4. Testing

```bash
# Run all tests
pnpm test

# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Build everything
pnpm build
```

## Deployment

### Manual Deployment with Wrangler

1. **Set up Cloudflare bindings:**
   ```bash
   # Create KV namespace for config storage
   npx wrangler kv:namespace create "CONFIG_KV" --preview false
   npx wrangler kv:namespace create "CONFIG_KV" --preview

   # Create D1 database for event storage
   npx wrangler d1 create relay-events
   ```

2. **Update wrangler.toml with your binding IDs:**
   ```toml
   [[kv_namespaces]]
   binding = "CONFIG_KV"
   id = "your-kv-id"
   preview_id = "your-kv-preview-id"

   [[d1_databases]]
   binding = "DB"
   database_name = "relay-events"
   database_id = "your-d1-id"
   ```

3. **Set environment variables:**
   ```bash
   # Optional: Set admin key for config API protection
   npx wrangler secret put ADMIN_KEY
   ```

4. **Deploy:**
   ```bash
   cd apps/relay-worker
   pnpm run deploy
   ```

### Automated Deployment with GitHub Actions

1. **Add repository secrets:**
   - `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
   - `ADMIN_KEY`: Optional admin key for config protection

2. **Trigger deployment:**
   - Push to main branch, or
   - Manually run the "Deploy Cloudflare Worker" workflow

3. **Access your relay:**
   - WebSocket: `wss://your-worker.your-account.workers.dev`
   - NIP-11 info: `curl -H "Accept: application/nostr+json" https://your-worker.your-account.workers.dev`
   - Admin UI: Deploy the admin-ui separately or use locally

## Configuration

### Relay Information
Configure basic relay metadata like name, description, contact info, and supported NIPs through the Admin UI.

### Plugin Configuration
Each NIP plugin can be configured independently:
- **Rate Limiting**: Set connection and event rate limits
- **NIP-05**: Configure name-to-pubkey mappings
- **NIP-96**: Set up file upload endpoints
- **NIP-42**: Configure authentication requirements
- And more...

## Development Guide

### Adding a New NIP Plugin

1. Create a new plugin file in `packages/core/src/plugins/nipXX.ts`
2. Implement the `NipPlugin` interface
3. Export the plugin in `packages/core/src/index.ts`
4. Register it in `apps/relay-worker/src/index.ts`
5. Add tests in `packages/core/tests/`

Example plugin structure:
```typescript
export const nipXXPlugin: NipPlugin<ConfigType> = {
  id: 'nip-XX',
  nip: XX,
  defaultConfig: { /* default config */ },
  configSchema: { /* JSON schema for admin UI */ },
  setup: async (ctx, config) => {
    // Setup logic
  },
  fetch: async (req, env, ctx) => {
    // Optional HTTP handler
  },
  onMessage: async (ws, msg, helpers) => {
    // Optional WebSocket handler
  }
}
```

### Code Quality

This project uses:
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type safety and better developer experience
- **Vitest**: Fast unit testing

Run quality checks:
```bash
pnpm lint        # Check for linting errors
pnpm lint:fix    # Auto-fix linting errors
pnpm format      # Format code with Prettier
pnpm typecheck   # Run TypeScript compiler checks
```

## Troubleshooting

### Common Issues

**Admin UI can't connect to relay:**
- Ensure the relay worker is running on the specified URL
- Check CORS settings if accessing from different domains
- Verify admin key if authentication is enabled

**Deployment fails:**
- Verify Cloudflare credentials and account ID
- Check that KV and D1 bindings are properly configured
- Ensure wrangler.toml has correct binding IDs

**Plugin configuration not saving:**
- Check browser console for errors
- Verify JSON schema validation in plugin configs
- Ensure admin key permissions if authentication is enabled

### Getting Help

- Check the [issues page](https://github.com/tayden1990/NOSTR-Relay-CF-Worker/issues) for known problems
- Review the test files for usage examples
- Check Cloudflare Workers documentation for deployment issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run quality checks: `pnpm lint && pnpm typecheck && pnpm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.










Checklist:

Connect a Nostr client to your relay.
Try basic queries and publish over WebSocket.
Use admin endpoints with your ADMIN_KEY.
(Optional) Configure NIP-05 and NIP-96 docs.
Relay endpoints:

WebSocket (use this in clients): wss://nostr-relay-worker.t-ak-sa.workers.dev/ws
NIP-11 info (GET): https://nostr-relay-worker.t-ak-sa.workers.dev/
Admin API (needs x-admin-key): https://nostr-relay-worker.t-ak-sa.workers.dev/admin/…
GET /admin/health
GET /admin/config
GET /admin/schemas
PUT /admin/config (JSON body)
NIP-05: https://nostr-relay-worker.t-ak-sa.workers.dev/.well-known/nostr.json
NIP-96: https://nostr-relay-worker.t-ak-sa.workers.dev/.well-known/nostr/nip96.json
Use it from a Nostr client:

Add relay URL: wss://nostr-relay-worker.t-ak-sa.workers.dev/ws
Subscribe: send ["REQ","sub-1",{ "kinds":[1], "limit":5 }] then expect ["EVENT","sub-1",event…] … ["EOSE","sub-1"]
Publish: send ["EVENT", nostrEvent]
Must be a valid NIP-01 event: id = sha256(serialized); valid schnorr sig; within size; allowed kind.
If AUTH is required (NIP-42):

On first EVENT, server replies ["AUTH","<challenge>"].
Respond with ["AUTH", authEvent] where authEvent is kind 22242, tags include ["challenge","<challenge>"] and ["relay","wss://nostr-relay-worker.t-ak-sa.workers.dev/ws"], signed by the same pubkey you’ll publish with.
After ["OK", authEvent.id, true, ""], resend your EVENT.
Admin configuration:

Read config: GET /admin/config with header x-admin-key: your ADMIN_KEY.
Update config: PUT /admin/config with JSON; useful tweaks:
Enable NIP-42 enforcement: plugins["nip-42"].requireAuthForPublish = true
NIP-22 moderation: plugins["nip-22"] fields like blockedAuthors, bannedKinds, blockedWords, etc.
NIP-05: plugins["nip-05"].names (JSON string mapping names to pubkeys) and relays (JSON string mapping pubkeys to relay arrays).
Schemas for the admin UI form: GET /admin/schemas.
Notes:

Some clients expect the relay root to upgrade to WS, but your WS endpoint is at /ws. Always use the /ws path.
Check supported NIPs via GET /; it reflects registered plugins.
Rate limiting is enabled; you may see ["NOTICE","rate-limited"] on bursts.
If you bound D1, event storage is persistent; otherwise it falls back to memory.
Want quick sanity checks or sample payloads? Say the word and I’ll paste minimal REQ/EVENT/AUTH examples you can copy into your WebSocket client.






Quick steps:

Start the Admin UI locally:
In the repo root, run:
pnpm install
pnpm --filter nostr-relay-admin-ui run dev
Open http://localhost:5173
In the Admin UI header:
Base URL: https://nostr-relay-worker.t-ak-sa.workers.dev
Admin Key: the same ADMIN_KEY you set in GitHub Secrets
Click “Load config” (or similar), edit settings, then “Save” (it’ll ask to confirm).
What the UI calls under the hood:
GET /admin/health, /admin/config, /admin/schemas
PUT /admin/config (with x-admin-key in headers)
Optional direct check (PowerShell):

Read config:
Invoke-RestMethod -Uri "https://nostr-relay-worker.t-ak-sa.workers.dev/admin/config" -Headers @{ "x-admin-key" = "<ADMIN_KEY>" }
Save config:
Invoke-RestMethod -Method Put -Uri "https://nostr-relay-worker.t-ak-sa.workers.dev/admin/config" -Headers @{ "x-admin-key" = "<ADMIN_KEY>"; "content-type" = "application/json" } -Body ($jsonConfig | ConvertTo-Json -Depth 10)
Tip:

CORS is open, so the local UI can talk to your Worker.
To host the UI, you can deploy apps/admin-ui to Cloudflare Pages and keep using the same Base URL and Admin Key.