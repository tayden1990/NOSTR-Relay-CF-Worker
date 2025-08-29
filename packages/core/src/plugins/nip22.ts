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
    blockedWords: [],
    blockedAuthors: [],
    bannedKinds: [],
    requireContentForKinds: [],
    contentRegexes: []
  },
  configSchema: {
    type: "object",
    properties: {
      enabled: { type: "boolean", title: "Enable NIP-22 checks", default: true },
      allowReplaceableKinds: { type: "boolean", title: "Allow replaceable kinds (30000-39999)", default: true },
      requireTargetForReactions: { type: "boolean", title: "Require e/p tag on kind 7 reactions", default: true },
      blockedWords: { type: "array", title: "Block if content includes any of these words", items: { type: "string" } },
      blockedAuthors: { type: "array", title: "Blocked pubkeys", items: { type: "string" } },
      bannedKinds: { type: "array", title: "Blocked kinds", items: { type: "number" } },
      requireContentForKinds: { type: "array", title: "Require non-empty content for kinds", items: { type: "number" } },
      contentRegexes: { type: "array", title: "Block if content matches any regex (JS)", items: { type: "string" } }
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
