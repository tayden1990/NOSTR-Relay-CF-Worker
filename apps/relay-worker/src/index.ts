import { KVConfigStorage, MemoryConfigStorage, PluginManager, nip11Plugin, nip01Plugin, nip09Plugin, nip13Plugin, nip40Plugin, nip42Plugin, nip45Plugin, nip92Plugin, nip96Plugin, nipEEPlugin, nip94Plugin, EventStore, D1Backend } from "@nostr-relay/core"
import type { EnvBindings, RelayConfig, RelayInfo } from "@nostr-relay/types"

export interface Env extends EnvBindings {}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,OPTIONS",
  "access-control-allow-headers": "content-type,x-admin-key",
}
const withCors = (res: Response) => {
  const h = new Headers(res.headers)
  Object.entries(corsHeaders).forEach(([k, v]) => h.set(k, v))
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h })
}
const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) } })

// simple router
const route = (req: Request) => {
  const url = new URL(req.url)
  return { path: url.pathname, url }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const log = console.log
    const storage = env.CONFIG_KV ? new KVConfigStorage(env) : new MemoryConfigStorage()
    const pm = new PluginManager(storage, log)

    // Register built-ins
  pm.register(nip11Plugin)
  pm.register(nip01Plugin)
  pm.register(nip09Plugin)
  pm.register(nip13Plugin)
  pm.register(nip40Plugin)
  pm.register(nip42Plugin)
  pm.register(nip45Plugin)
  pm.register(nip92Plugin)
  pm.register(nip96Plugin)
  pm.register(nipEEPlugin)
  pm.register(nip94Plugin)

    // Ensure relay supported NIPs reflect plugins
    const cfg = await storage.getAll()
    cfg.relay.supported_nips = pm.getSupportedNips()
    await storage.setAll(cfg)

    await pm.setupAll(env)

  const { path, url } = route(req)

    // WebSocket endpoint
    if (path === "/ws" && req.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
      server.accept()
      // Configure event store backend once
      if ((env as any).DB) {
        EventStore.configure(new D1Backend((env as any).DB))
      }
      server.addEventListener("message", async (ev) => {
        try {
          const data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data
          await pm.onWSMessage(server, data, {
            send: (ws, d) => ws.send(JSON.stringify(d)),
            broadcast: (d) => server.send(JSON.stringify(d)), // naive single-socket broadcast for scaffold
            relayUrl: (req.headers.get("x-forwarded-proto") === "https" ? "wss" : "ws") + "://" + (req.headers.get("host") || "") + path
          })
        } catch (e) {
          server.send(JSON.stringify(["NOTICE", "invalid message"]))
        }
      })
      return new Response(null, { status: 101, webSocket: client })
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Admin API
    if (path.startsWith("/admin/")) {
      const provided = req.headers.get("x-admin-key") || url.searchParams.get("key") || undefined
      const required = (env as any).ADMIN_KEY as string | undefined
      if (required && provided !== required) return withCors(new Response("Unauthorized", { status: 401 }))
      if (path === "/admin/config" && req.method === "GET") {
        const data = await storage.getAll()
        return withCors(json(data))
      }
      if (path === "/admin/config" && req.method === "PUT") {
        const body = (await req.json()) as RelayConfig
        await storage.setAll(body)
        return withCors(json({ ok: true }))
      }
      if (path === "/admin/schemas" && req.method === "GET") {
        return withCors(json(pm.getAdminSchemas()))
      }
    }

    // NIP-11 at root per spec
    if (path === "/") {
      const conf = await storage.getAll()
      const info: RelayInfo = conf.relay
      return withCors(json(info))
    }

    // NIP-05 stub for /.well-known/nostr.json?name=
    if (path === "/.well-known/nostr.json") {
      const name = url.searchParams.get("name") || "_"
      const conf = await storage.getAll()
      const pk = conf.relay.pubkey || "" // optional admin pubkey
      const body = { names: { [name]: pk } }
      return withCors(json(body))
    }

    // NIP-96 discovery document
    if (path === "/.well-known/nostr/nip96.json") {
      const conf = await storage.getAll()
      const nip96 = (conf.plugins?.["nip-96"] || {}) as any
      const body = {
        api_url: nip96.api_url || "",
        download_url: nip96.download_url || "",
        delegated_to_url: nip96.delegated_to_url || "",
        supported_nips: Array.isArray(nip96.supported_nips) ? nip96.supported_nips : [96],
        tos_url: nip96.tos_url || undefined,
        content_types: Array.isArray(nip96.content_types) ? nip96.content_types : ["image/*", "video/*", "audio/*"],
        plans: nip96.plans || undefined
      }
      return withCors(json(body))
    }

    // Delegate to plugins
  const res = await pm.fetch(req, env, ctx)
  if (res) return withCors(res)

  return withCors(new Response("Not found", { status: 404 }))
  }
}
