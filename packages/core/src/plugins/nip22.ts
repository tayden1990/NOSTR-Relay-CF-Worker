import type { JsonSchema, NipPlugin, NostrEvent, WSHelpers } from "@nostr-relay/types"

type Nip22Config = {
  enabled: boolean
  allowReplaceableKinds: boolean
  requireTargetForReactions: boolean
  blockedWords: string[]
  blockedAuthors: string[]
  bannedKinds: number[]
  requireContentForKinds: number[]
  contentRegexes: string[]
}

export const nip22Plugin: NipPlugin<Nip22Config> = {
  id: "nip-22",
  nip: 22,
  defaultConfig: {
    enabled: true,
    allowReplaceableKinds: true,
    requireTargetForReactions: true,
    blockedWords: ["spam", "scam", "porn"],
    blockedAuthors: [],
    bannedKinds: [],
    requireContentForKinds: [1],
    contentRegexes: []
  },
  configSchema: {
    type: "object",
    properties: {
      enabled: { 
        type: "boolean", 
        title: "Enable content validation", 
        default: true,
        description: "Enables NIP-22 content validation and moderation features. Provides comprehensive filtering capabilities for spam prevention and content policy enforcement."
      },
      allowReplaceableKinds: { 
        type: "boolean", 
        title: "Allow replaceable events (kinds 30000-39999)", 
        default: true,
        description: "Permits replaceable/addressable events like profiles, relay lists, etc. Disable only if you want to prevent dynamic content updates. Most relays should keep this enabled."
      },
      requireTargetForReactions: { 
        type: "boolean", 
        title: "Require target for reactions (kind 7)", 
        default: true,
        description: "Requires reaction events to reference a target event or pubkey via 'e' or 'p' tags. Prevents meaningless reactions and ensures reactions have context."
      },
      blockedWords: { 
        type: "array", 
        title: "Blocked words in content", 
        items: { type: "string" },
        description: "Case-insensitive words to block in event content. Useful for basic spam/abuse prevention. Example words: 'spam', 'scam', 'viagra'. Use sparingly to avoid false positives."
      },
      blockedAuthors: { 
        type: "array", 
        title: "Blocked author public keys", 
        items: { type: "string" },
        description: "List of public keys (64-char hex) to block completely. Alternative to NIP-01 blockPubkeys. Use for persistent spammers or banned users."
      },
      bannedKinds: { 
        type: "array", 
        title: "Banned event kinds", 
        items: { type: "number" },
        description: "Event kinds to reject completely. Use to disable specific event types. Example: block kind 4 (encrypted DMs) for public-only relays, or kind 1984 (reporting) to avoid drama."
      },
      requireContentForKinds: { 
        type: "array", 
        title: "Require non-empty content for kinds", 
        items: { type: "number" },
        description: "Event kinds that must have non-empty content. Default requires content for kind 1 (text notes). Prevents empty posts and spam. Add other kinds as needed: 30023 (articles), etc."
      },
      contentRegexes: { 
        type: "array", 
        title: "Block content matching regex patterns", 
        items: { type: "string" },
        description: "JavaScript regular expressions to match against content. Powerful but complex - test carefully! Example: '^https://spam-site\\.com' to block specific URLs. Use with caution."
      }
    }
  } satisfies JsonSchema,
  setup: ({ registerWSMessageHandler, getConfig }) => {
    registerWSMessageHandler(async (ws, msg, helpers: WSHelpers) => {
      if (!Array.isArray(msg)) return false
      const [type, payload] = msg
      if (type !== "EVENT") return false
      const cfg = (await getConfig()) as Nip22Config
      if (!cfg.enabled) return false
      const ev = payload as NostrEvent
      // Generic blocks
      if (cfg.bannedKinds?.includes(ev.kind)) { helpers.send(ws, ["OK", ev.id, false, "blocked:nip22-kind"]); return true }
      if (cfg.blockedAuthors?.includes(ev.pubkey)) { helpers.send(ws, ["OK", ev.id, false, "blocked:nip22-author"]); return true }
      if ((cfg.requireContentForKinds?.includes(ev.kind)) && (!ev.content || ev.content.trim().length === 0)) {
        helpers.send(ws, ["OK", ev.id, false, "invalid:nip22-empty-content"]) ; return true
      }
      if (cfg.blockedWords && cfg.blockedWords.length > 0) {
        const lc = (ev.content || "").toLowerCase()
        if (cfg.blockedWords.some(w => w && lc.includes(w.toLowerCase()))) {
          helpers.send(ws, ["OK", ev.id, false, "blocked:nip22-content-word"]) ; return true
        }
      }
      if (cfg.contentRegexes && cfg.contentRegexes.length > 0) {
        for (const pattern of cfg.contentRegexes) {
          try {
            const re = new RegExp(pattern)
            if (re.test(ev.content || "")) { helpers.send(ws, ["OK", ev.id, false, "blocked:nip22-content-regex"]) ; return true }
          } catch { /* ignore bad regex */ }
        }
      }
      // Reaction events should reference a target (e or p tag)
      if (ev.kind === 7 && cfg.requireTargetForReactions) {
        const hasRef = ev.tags.some(t => t[0] === 'e' || t[0] === 'p')
        if (!hasRef) { helpers.send(ws, ["OK", ev.id, false, "invalid:nip22-reaction-no-target"]); return true }
      }
      // Replaceable kinds: allow; moderation flagging point (no-op)
      if (ev.kind >= 30000 && ev.kind < 40000 && !cfg.allowReplaceableKinds) {
        helpers.send(ws, ["OK", ev.id, false, "blocked:nip22-replaceable"])
        return true
      }
      return false
    })
  }
}

export default nip22Plugin
