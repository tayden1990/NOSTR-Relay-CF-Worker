import React, { useEffect, useMemo, useState } from 'react'

type JsonSchema = {
  type: 'object'
  properties: Record<string, any>
  required?: string[]
}

const API = {
  baseUrl: '',
  key: ''
}

function Field({ name, schema, value, onChange }: any) {
  const t = schema.type
  if (t === 'string') return <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={schema.title || name} />
  if (t === 'number') return <input type="number" value={value ?? 0} onChange={e => onChange(Number(e.target.value))} placeholder={schema.title || name} />
  if (t === 'boolean') return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
  if (t === 'array') return <textarea value={(value ?? []).join(',')} onChange={e => onChange(e.target.value.split(',').map(v => v.trim()).filter(Boolean))} />
  if (t === 'object') return <SchemaForm schema={schema} value={value ?? {}} onChange={onChange} />
  return <span>Unsupported</span>
}

function SchemaForm({ schema, value, onChange }: any) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {Object.entries(schema.properties).map(([k, v]: any) => (
        <label key={k} style={{ display: 'grid', gap: 4 }}>
          <span>{v.title || k}</span>
          <Field name={k} schema={v} value={value?.[k]} onChange={(nv: any) => onChange({ ...value, [k]: nv })} />
        </label>
      ))}
    </div>
  )
}

export function App() {
  const [schemas, setSchemas] = useState<Record<string, JsonSchema>>({})
  const [config, setConfig] = useState<any>(null)
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:8787')
  const [key, setKey] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      setBusy(true); setError(null)
      const headers: any = {}
      if (key) headers['x-admin-key'] = key
      const schRes = await fetch(`${baseUrl}/admin/schemas`, { headers })
      if (!schRes.ok) throw new Error(`schemas ${schRes.status}`)
      const sch = await schRes.json()
      const cfgRes = await fetch(`${baseUrl}/admin/config`, { headers })
      if (!cfgRes.ok) throw new Error(`config ${cfgRes.status}`)
      const cfg = await cfgRes.json()
      setSchemas(sch)
      setConfig(cfg)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Load failed')
    } finally { setBusy(false) }
  }

  async function save() {
    try {
      setBusy(true); setError(null)
      const headers: any = { 'content-type': 'application/json' }
      if (key) headers['x-admin-key'] = key
      const res = await fetch(`${baseUrl}/admin/config`, { method: 'PUT', headers, body: JSON.stringify(config) })
      if (!res.ok) throw new Error(`save ${res.status}`)
      alert('Saved')
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Save failed')
    } finally { setBusy(false) }
  }

  const pluginIds = useMemo(() => Object.keys(schemas), [schemas])

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', display: 'grid', gap: 16 }}>
      <h1>Nostr Relay Admin</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="Relay URL" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} style={{ flex: 1 }} />
        <input placeholder="Admin Key (x-admin-key)" value={key} onChange={e => setKey(e.target.value)} />
        <button onClick={load} disabled={busy}>Load</button>
        <button onClick={save} disabled={!config || busy}>Save</button>
      </div>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {config && (
        <div style={{ display: 'grid', gap: 24 }}>
          <section>
            <h2>Relay</h2>
            <SchemaForm schema={{ type: 'object', properties: {
              name: { type: 'string', title: 'Name' },
              description: { type: 'string', title: 'Description' },
              pubkey: { type: 'string', title: 'Pubkey' },
              contact: { type: 'string', title: 'Contact' },
              software: { type: 'string', title: 'Software' },
              version: { type: 'string', title: 'Version' },
              payments_url: { type: 'string', title: 'Payments URL' },
              supported_nips: { type: 'array', title: 'Supported NIPs', items: { type: 'number' } }
            } }} value={config.relay} onChange={(v: any) => setConfig({ ...config, relay: v })} />
          </section>

          <section>
            <h2>Plugins</h2>
            {pluginIds.map(pid => (
              <div key={pid} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <h3>{pid}</h3>
                <SchemaForm schema={schemas[pid]} value={config.plugins?.[pid] ?? {}} onChange={(v: any) => setConfig({ ...config, plugins: { ...config.plugins, [pid]: v } })} />
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
