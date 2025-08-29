export type NostrEvent = {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig: string
}

export type NostrREQ = ["REQ", string, ...Array<Record<string, unknown>>]
export type NostrEVENT = ["EVENT", NostrEvent]
export type NostrCLOSE = ["CLOSE", string]
export type NostrOK = ["OK", string, boolean, string]
export type NostrNOTICE = ["NOTICE", string]

export type RelayInfo = {
  name?: string
  description?: string
  pubkey?: string
  contact?: string
  software?: string
  version?: string
  supported_nips?: number[]
  limitation?: Record<string, unknown>
  payments_url?: string
  fees?: Record<string, unknown>
}

// Plugin contracts
export interface NipPlugin<Config = unknown> {
  id: string // e.g., "nip-11"
  nip: number
  defaultConfig: Config
  // Called at startup with current config
  setup(ctx: PluginContext, config: Config): Promise<void> | void
  // Optional HTTP handler (for NIP-11, admin APIs, etc.)
  fetch?: (req: Request, env: EnvBindings, ctx: ExecutionContext) => Promise<Response | undefined> | Response | undefined
  // Optional WebSocket message hook
  onMessage?: (ws: WebSocket, msg: unknown, helpers: WSHelpers) => Promise<boolean | void> | boolean | void // return true if handled
  // Optional admin form schema (JSON Schema basic subset)
  configSchema?: JsonSchema
}

export type PluginContext = {
  log: (...args: unknown[]) => void
  getConfig: () => Promise<unknown>
  setConfig: (value: unknown) => Promise<void>
  registerWSMessageHandler: (handler: (ws: WebSocket, msg: unknown, helpers: WSHelpers) => Promise<boolean | void> | boolean | void) => void
}

export type WSHelpers = {
  send: (ws: WebSocket, data: unknown) => void
  broadcast: (data: unknown) => void
  relayUrl?: string
}

export type EnvBindings = {
  CONFIG_KV?: KVNamespace
  R2?: R2Bucket
  DB?: D1Database
  // Extend with more bindings as you need
}

// Minimal JSON schema subset for UI forms
export type JsonSchema = {
  type: "object"
  properties: Record<string, JsonSchemaProperty>
  required?: string[]
}

export type JsonSchemaProperty =
  | { type: "string"; title?: string; description?: string; default?: string; enum?: string[] }
  | { type: "number"; title?: string; description?: string; default?: number; minimum?: number; maximum?: number }
  | { type: "boolean"; title?: string; description?: string; default?: boolean }
  | { type: "array"; title?: string; description?: string; items: { type: "string" | "number" | "boolean" }; default?: unknown[] }
  | JsonSchema

export type RelayConfig = {
  relay: RelayInfo
  plugins: Record<string, unknown> // pluginId -> config
}
