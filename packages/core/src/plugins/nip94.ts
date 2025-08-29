import type { JsonSchema, NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"

type Nip94Config = {
  enabled: boolean
  requireTags: boolean
  allowedDomains: string[]
  blockedDomains: string[]
}

function urlHost(u: string): string | undefined { try { return new URL(u).host.toLowerCase() } catch { return undefined } }

export const nip94Plugin: NipPlugin<Nip94Config> = {
  id: "nip-94",
  nip: 94,
  defaultConfig: { enabled: true, requireTags: true, allowedDomains: [], blockedDomains: [] },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-94 checks", default: true },
      requireTags: { type: "boolean", title: "Require url and ox tags", default: true },
      allowedDomains: { type: "array", title: "Allowed domains (empty = any)", items: { type: "string" } },
      blockedDomains: { type: "array", title: "Blocked domains", items: { type: "string" } }
    }
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, payload] = msg
      if (type !== "EVENT") return false
      const ev = payload as NostrEvent
      if (ev.kind !== 1063) return false
      const cfg = (await getConfig()) as Nip94Config
      if (!cfg.enabled) return false

      const urlTag = ev.tags.find(t => t[0] === 'url')?.[1]
      const oxTag = ev.tags.find(t => t[0] === 'ox')?.[1]
      if (cfg.requireTags && (!urlTag || !oxTag)) { helpers.send(ws, ["OK", ev.id, false, "invalid:nip94-missing-tags"]); return true }
      if (urlTag) {
        const host = urlHost(urlTag)
        if (host) {
          if (cfg.blockedDomains.map(d => d.toLowerCase()).includes(host)) { helpers.send(ws, ["OK", ev.id, false, "nip94:blocked-domain"]); return true }
          if (cfg.allowedDomains.length > 0 && !cfg.allowedDomains.map(d => d.toLowerCase()).includes(host)) { helpers.send(ws, ["OK", ev.id, false, "nip94:not-allowed-domain"]); return true }
        }
      }
      return false
    })
  }
}

export default nip94Plugin
