import type { EnvBindings, RelayConfig } from "@nostr-relay/types"
import type { ConfigStorage } from "./plugin-manager"

const DEFAULT_CONFIG: RelayConfig = {
  relay: {
    name: "My Community Relay",
    description: "A welcoming community relay for thoughtful discussions and meaningful connections. We encourage respectful dialogue and support free expression within our community guidelines.",
    software: "https://github.com/tayden1990/NOSTR-Relay-CF-Worker",
    version: "1.0.0",
    supported_nips: [1, 9, 11, 22]
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
