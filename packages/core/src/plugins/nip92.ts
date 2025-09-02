import type { JsonSchema, NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"

type Nip92Config = {
  enabled: boolean
  enforceImetaUrlMatch: boolean
  allowedDomains: string[]
  blockedDomains: string[]
}

function parseImeta(tag: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (let i = 1; i < tag.length; i++) {
    const part = tag[i]
    const idx = part.indexOf(" ")
    if (idx === -1) continue
    const key = part.slice(0, idx)
    const val = part.slice(idx + 1)
    if (!out[key]) out[key] = []
    out[key].push(val)
  }
  return out
}

function urlHost(u: string): string | undefined {
  try { return new URL(u).host.toLowerCase() } catch { return undefined }
}

export const nip92Plugin: NipPlugin<Nip92Config> = {
  id: "nip-92",
  nip: 92,
  defaultConfig: {
    enabled: true,
    enforceImetaUrlMatch: false,
    allowedDomains: [],
    blockedDomains: [
      "malicious-site.com",
      "spam-images.net"
    ]
  },
  configSchema: {
    type: "object",
    properties: {
      enabled: { 
        type: "boolean", 
        title: "Enable media attachment validation", 
        default: true,
        description: "Validates media attachments in events using NIP-92 imeta tags. Helps prevent spam and malicious content by checking media URLs against allow/block lists."
      },
      enforceImetaUrlMatch: { 
        type: "boolean", 
        title: "Require imeta URLs to appear in content", 
        default: false,
        description: "When enabled, requires that imeta tag URLs also appear in the event content. Stricter validation but may reject some legitimate media posts. Recommended for high-security relays."
      },
      allowedDomains: { 
        type: "array", 
        title: "Allowed media domains", 
        items: { type: "string" },
        description: "Whitelist of domains for media URLs (empty = allow all). Use for strict content control. Popular media hosts: 'nostr.build', 'void.cat', 'imgur.com', 'i.imgur.com'. Format: 'domain.com' (no protocol)."
      },
      blockedDomains: { 
        type: "array", 
        title: "Blocked media domains", 
        items: { type: "string" },
        description: "Blacklist of domains to reject for media URLs. Use to block known spam or malicious hosts. Takes precedence over allowed domains. Format: 'domain.com' (no protocol)."
      }
    }
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, evRaw] = msg
      if (type !== "EVENT") return false
      const ev = evRaw as NostrEvent
      const cfg = (await getConfig()) as Nip92Config
      if (!cfg.enabled) return false

      // collect imeta tags
      const imetas = ev.tags.filter(t => t[0] === "imeta")
      if (imetas.length === 0) return false

      const content = ev.content || ""
      for (const t of imetas) {
        const meta = parseImeta(t)
        const urls = meta["url"] || []
        for (const u of urls) {
          const host = urlHost(u)
          if (host) {
            if (cfg.blockedDomains.map(d => d.toLowerCase()).includes(host)) {
              helpers.send(ws, ["OK", ev.id, false, "imeta:blocked-domain"]) // reject
              return true
            }
            if (cfg.allowedDomains.length > 0 && !cfg.allowedDomains.map(d => d.toLowerCase()).includes(host)) {
              helpers.send(ws, ["OK", ev.id, false, "imeta:not-allowed-domain"]) // reject
              return true
            }
          }
          if (cfg.enforceImetaUrlMatch && !content.includes(u)) {
            helpers.send(ws, ["OK", ev.id, false, "imeta:url-mismatch"]) // reject
            return true
          }
        }
      }
      return false
    })
  }
}

export default nip92Plugin
