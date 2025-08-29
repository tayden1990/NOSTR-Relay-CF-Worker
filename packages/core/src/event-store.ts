import type { NostrEvent } from "@nostr-relay/types"

export type EventFilter = any

export interface EventStoreBackend {
  add(ev: NostrEvent): Promise<void>
  delete(ids: string[]): Promise<void>
  get(id: string): Promise<NostrEvent | undefined>
  all(): Promise<NostrEvent[]>
  query(filters: EventFilter[]): Promise<NostrEvent[]>
}

class MemoryBackend implements EventStoreBackend {
  private events: NostrEvent[] = []
  async add(ev: NostrEvent) {
    const i = this.events.findIndex(e => e.id === ev.id)
    if (i >= 0) this.events[i] = ev; else this.events.push(ev)
  }
  async delete(ids: string[]) { this.events = this.events.filter(e => !ids.includes(e.id)) }
  async get(id: string) { return this.events.find(e => e.id === id) }
  async all() { return [...this.events] }
  async query(filters: EventFilter[]) {
    const matches = (ev: NostrEvent, f: any): boolean => {
      if (f.ids && Array.isArray(f.ids) && !f.ids.some((id: string) => ev.id.startsWith(id))) return false
      if (f.kinds && Array.isArray(f.kinds) && !f.kinds.includes(ev.kind)) return false
      if (f.authors && Array.isArray(f.authors) && !f.authors.some((a: string) => ev.pubkey.startsWith(a))) return false
      if (typeof f.since === 'number' && ev.created_at < f.since) return false
      if (typeof f.until === 'number' && ev.created_at > f.until) return false
      for (const [k, vals] of Object.entries(f)) {
        if (k.length === 1 && Array.isArray(vals)) {
          const tagVals = ev.tags.filter(t => t[0] === k).map(t => t[1])
          if (!vals.some((v: string) => tagVals.includes(v))) return false
        }
      }
      return true
    }
    let out: NostrEvent[] = []
    for (const f of filters) {
      let subset = (await this.all()).filter(e => matches(e, f))
      if (typeof f.limit === 'number') subset = subset.slice(0, f.limit)
      out.push(...subset)
    }
    return out
  }
}

let backend: EventStoreBackend = new MemoryBackend()

export class EventStore {
  static configure(b: EventStoreBackend) { backend = b }
  static async add(ev: NostrEvent) { await backend.add(ev) }
  static async delete(ids: string[]) { await backend.delete(ids) }
  static async get(id: string) { return backend.get(id) }
  static async all() { return backend.all() }
  static async query(filters: EventFilter[]) { return backend.query(filters) }
}

export class D1Backend implements EventStoreBackend {
  constructor(private db: D1Database) {}
  // Exposed for tests
  static buildQuery(filters: EventFilter[]) {
    const queries: { sql: string; params: any[] }[] = []
    for (const f of filters) {
      const where: string[] = []
      const params: any[] = []
      if (Array.isArray((f as any).kinds) && (f as any).kinds.length) {
        where.push(`kind IN (${(f as any).kinds.map(() => '?').join(',')})`); params.push(...(f as any).kinds)
      }
      if (Array.isArray((f as any).authors) && (f as any).authors.length) {
        where.push(`${(f as any).authors.map(() => 'pubkey LIKE ?').join(' OR ')}`); params.push(...(f as any).authors.map((a: string) => a + '%'))
      }
      if (Array.isArray((f as any).ids) && (f as any).ids.length) {
        where.push(`${(f as any).ids.map(() => 'id LIKE ?').join(' OR ')}`); params.push(...(f as any).ids.map((i: string) => i + '%'))
      }
      if (typeof (f as any).since === 'number') { where.push('created_at >= ?'); params.push((f as any).since) }
      if (typeof (f as any).until === 'number') { where.push('created_at <= ?'); params.push((f as any).until) }
      const tagClauses: string[] = []
      for (const [k, vals] of Object.entries(f as any)) {
        if (k.startsWith('#') && k.length === 2 && Array.isArray(vals)) {
          const name = k.slice(1)
          tagClauses.push(`EXISTS (SELECT 1 FROM tags tg WHERE tg.event_id = e.id AND tg.name = ? AND tg.value IN (${(vals as any[]).map(() => '?').join(',')}))`)
          params.push(name, ...(vals as any[]))
        }
      }
      const fullWhere = [where.join(' AND '), ...tagClauses].filter(Boolean).join(' AND ')
      const limit = typeof (f as any).limit === 'number' ? Math.max(0, (f as any).limit) : 500
      const sql = `SELECT e.json FROM events e ${fullWhere ? 'WHERE ' + fullWhere : ''} ORDER BY created_at DESC LIMIT ${limit}`
      queries.push({ sql, params })
    }
    return queries
  }
  private async init() {
    // Create tables if not exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        pubkey TEXT,
        kind INTEGER,
        created_at INTEGER,
        content TEXT,
        json TEXT
      );
      CREATE TABLE IF NOT EXISTS tags (
        event_id TEXT,
        name TEXT,
        value TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_kind_created ON events(kind, created_at);
      CREATE INDEX IF NOT EXISTS idx_events_pubkey_created ON events(pubkey, created_at);
      CREATE INDEX IF NOT EXISTS idx_tags_name_value ON tags(name, value);
      CREATE INDEX IF NOT EXISTS idx_tags_event ON tags(event_id);
    `)
  }
  async add(ev: NostrEvent) {
    await this.init()
    const json = JSON.stringify(ev)
    await this.db.exec("BEGIN TRANSACTION;")
    await this.db.prepare("INSERT OR REPLACE INTO events (id,pubkey,kind,created_at,content,json) VALUES (?,?,?,?,?,?)").bind(ev.id, ev.pubkey, ev.kind, ev.created_at, ev.content, json).run()
    await this.db.prepare("DELETE FROM tags WHERE event_id = ?").bind(ev.id).run()
    for (const t of ev.tags) {
      const name = t[0]
      const value = t[1] ?? ""
      await this.db.prepare("INSERT INTO tags (event_id,name,value) VALUES (?,?,?)").bind(ev.id, name, value).run()
    }
    await this.db.exec("COMMIT;")
  }
  async delete(ids: string[]) {
    if (ids.length === 0) return
    await this.init()
    await this.db.exec("BEGIN TRANSACTION;")
    for (const id of ids) {
      await this.db.prepare("DELETE FROM events WHERE id = ?").bind(id).run()
      await this.db.prepare("DELETE FROM tags WHERE event_id = ?").bind(id).run()
    }
    await this.db.exec("COMMIT;")
  }
  async get(id: string): Promise<NostrEvent | undefined> {
    await this.init()
    const r = await this.db.prepare("SELECT json FROM events WHERE id = ?").bind(id).first<{ json: string }>()
    return r ? (JSON.parse(r.json) as NostrEvent) : undefined
  }
  async all(): Promise<NostrEvent[]> {
    await this.init()
    const rs = await this.db.prepare("SELECT json FROM events ORDER BY created_at DESC LIMIT 1000").all<{ json: string }>()
    return (rs.results || []).map(r => JSON.parse(r.json) as NostrEvent)
  }
  async query(filters: EventFilter[]): Promise<NostrEvent[]> {
    await this.init()
    const collected: NostrEvent[] = []
    for (const { sql, params } of D1Backend.buildQuery(filters)) {
      const rs = await this.db.prepare(sql).bind(...params).all<{ json: string }>()
      const events = (rs.results || []).map(r => JSON.parse(r.json) as NostrEvent)
      collected.push(...events)
    }
    return collected
  }
}
