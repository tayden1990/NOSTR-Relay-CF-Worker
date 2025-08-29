import type { EnvBindings, RelayConfig } from "@nostr-relay/types"
import type { ConfigStorage } from "./plugin-manager"

const DEFAULT_CONFIG: RelayConfig = {
  relay: {
    name: "My Nostr Relay",
    description: "A modular NIP-enabled relay",
    software: "nostr-relay-cf-worker",
    version: "0.0.1",
    supported_nips: []
  },
  plugins: {}
}

export class MemoryConfigStorage implements ConfigStorage {
  private config: RelayConfig = DEFAULT_CONFIG
  async getAll(): Promise<RelayConfig> {
    return this.config
  }
  async setAll(config: RelayConfig): Promise<void> {
    this.config = config
  }
  async getPluginConfig<T>(pluginId: string, defaultValue: T): Promise<T> {
    const cfg = await this.getAll()
    return (cfg.plugins[pluginId] as T) ?? defaultValue
  }
  async setPluginConfig<T>(pluginId: string, value: T): Promise<void> {
    const cfg = await this.getAll()
    cfg.plugins[pluginId] = value as any
    await this.setAll(cfg)
  }
}

export class KVConfigStorage implements ConfigStorage {
  private KV: KVNamespace
  private KEY = "relay-config.json"
  constructor(env: EnvBindings) {
    if (!env.CONFIG_KV) throw new Error("CONFIG_KV binding is required")
    this.KV = env.CONFIG_KV
  }
  async getAll(): Promise<RelayConfig> {
    const txt = await this.KV.get(this.KEY)
    if (!txt) return DEFAULT_CONFIG
    try {
      return JSON.parse(txt) as RelayConfig
    } catch {
      return DEFAULT_CONFIG
    }
  }
  async setAll(config: RelayConfig): Promise<void> {
    await this.KV.put(this.KEY, JSON.stringify(config))
  }
  async getPluginConfig<T>(pluginId: string, defaultValue: T): Promise<T> {
    const cfg = await this.getAll()
    return (cfg.plugins[pluginId] as T) ?? defaultValue
  }
  async setPluginConfig<T>(pluginId: string, value: T): Promise<void> {
    const cfg = await this.getAll()
    cfg.plugins[pluginId] = value as any
    await this.setAll(cfg)
  }
}
