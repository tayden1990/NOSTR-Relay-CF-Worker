import type { EnvBindings, JsonSchema, NipPlugin, PluginContext, RelayConfig, WSHelpers } from "@nostr-relay/types"

export class PluginManager {
  private plugins: NipPlugin[] = []
  private wsHandlers: Array<(ws: WebSocket, msg: unknown, helpers: WSHelpers) => Promise<boolean | void> | boolean | void> = []
  constructor(private storage: ConfigStorage, private log: (...args: unknown[]) => void) {}

  register(plugin: NipPlugin) {
    this.plugins.push(plugin)
  }

  getSupportedNips(): number[] {
  // Only include plausible NIP ids (1..199). This excludes event kinds like 445 from NIP-EE plugin.
  const nums = this.plugins.map(p => p.nip).filter(n => Number.isFinite(n) && n >= 1 && n < 200)
  return Array.from(new Set(nums)).sort((a, b) => a - b)
  }

  async setupAll(_env: EnvBindings) {
    for (const p of this.plugins) {
      const ctx = {
        log: this.log,
        getConfig: async () => await this.storage.getPluginConfig(p.id, p.defaultConfig),
        setConfig: async (value: unknown) => await this.storage.setPluginConfig(p.id, value),
        registerWSMessageHandler: (handler: (ws: WebSocket, msg: unknown, helpers: WSHelpers) => Promise<boolean | void> | boolean | void) => this.wsHandlers.push(handler)
      } as unknown as PluginContext
      const cfg = await this.storage.getPluginConfig(p.id, p.defaultConfig)
      await p.setup(ctx, cfg as any)
    }
  }

  async fetch(req: Request, env: EnvBindings, ctx: ExecutionContext): Promise<Response | undefined> {
    for (const p of this.plugins) {
      if (p.fetch) {
        const res = await p.fetch(req, env, ctx)
        if (res) return res
      }
    }
    return undefined
  }

  async onWSMessage(ws: WebSocket, msg: unknown, helpers: WSHelpers): Promise<boolean> {
    for (const h of this.wsHandlers) {
      const handled = await h(ws, msg, helpers)
      if (handled) return true
    }
    for (const p of this.plugins) {
      if (p.onMessage) {
        const handled = await p.onMessage(ws, msg, helpers)
        if (handled) return true
      }
    }
    return false
  }

  getAdminSchemas(): Record<string, JsonSchema | undefined> {
    const result: Record<string, JsonSchema | undefined> = {}
    for (const p of this.plugins) result[p.id] = p.configSchema
    return result
  }
}

export interface ConfigStorage {
  getAll(): Promise<RelayConfig>
  setAll(config: RelayConfig): Promise<void>
  getPluginConfig<T>(pluginId: string, defaultValue: T): Promise<T>
  setPluginConfig<T>(pluginId: string, value: T): Promise<void>
}
