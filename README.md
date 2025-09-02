# Nostr Relay CF Worker (Modular, NIP-pluggable)

This monorepo scaffolds a modular Nostr Relay built for Cloudflare Workers, with a plugin system to gradually add NIPs and a modern Admin UI to manage all configurations.

![Admin UI Screenshot](https://github.com/user-attachments/assets/dc22351f-d91f-4b9c-b8f5-a2373a75c050)

## Features

- 🔌 **Plugin Architecture**: Modular NIP implementations with easy extensibility
- 🎨 **Modern Admin UI**: Clean, responsive interface for configuration management with enhanced user guidance
- ☁️ **Cloudflare Workers**: Serverless deployment with global edge distribution
- 🔐 **Secure Configuration**: Admin key authentication and comprehensive input validation
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- ⚡ **Performance**: Fast loading and optimized bundle sizes
- 🧪 **Well Tested**: Comprehensive test suite with 100% pass rate
- 🔧 **Easy Configuration**: JSON schema-driven config forms with helpful descriptions
- 🛡️ **Rate Limiting**: Built-in protection against spam and abuse
- 🗃️ **Flexible Storage**: Support for both KV and in-memory configuration storage

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
- NIP-445: Extended events (custom implementation for key packages, welcome events, and group events)
- Rate limiting plugin (custom utility)

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

**Note**: When CONFIG_KV is not available (e.g., in tests), the relay will use in-memory storage with the default configuration values.

## Configuration

### Default Relay Settings
When first deployed, the relay starts with these default settings:
- **Name**: "My Nostr Relay"
- **Software**: "nostr-relay-cf-worker"
- **Version**: "0.0.1"
- **Description**: "A welcoming community relay for thoughtful discussions and meaningful connections..."
- **Supported NIPs**: Automatically populated based on enabled plugins

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
- If tests fail during deployment, ensure DEFAULT_CONFIG matches test expectations

**NIP-11 info endpoint returns unexpected values:**
- Check that DEFAULT_CONFIG in packages/core/src/storage.ts has the correct values
- The default relay name should be "My Nostr Relay" and software should be "nostr-relay-cf-worker"

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