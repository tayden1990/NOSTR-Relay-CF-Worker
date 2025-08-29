import React, { useMemo, useState } from 'react'

type JsonSchema = {
  type: 'object'
  properties: Record<string, any>
  required?: string[]
}

type FieldProps = {
  name: string
  schema: any
  value: any
  onChange: (value: any) => void
}

type ConfigData = {
  relay: Record<string, any>
  plugins: Record<string, any>
}

function Field({ name, schema, value, onChange }: FieldProps) {
  const t = schema.type
  
  const inputStyle = {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100%',
    fontFamily: 'inherit',
  }

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical' as const,
  }

  if (t === 'string') {
    return (
      <input 
        style={inputStyle}
        value={value ?? ''} 
        onChange={e => onChange(e.target.value)} 
        placeholder={schema.description || schema.title || name} 
      />
    )
  }
  
  if (t === 'number') {
    return (
      <input 
        style={inputStyle}
        type="number" 
        value={value ?? 0} 
        onChange={e => onChange(Number(e.target.value))} 
        placeholder={schema.description || schema.title || name}
        min={schema.minimum}
        max={schema.maximum}
      />
    )
  }
  
  if (t === 'boolean') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input 
          type="checkbox" 
          checked={!!value} 
          onChange={e => onChange(e.target.checked)} 
          style={{ margin: 0 }}
        />
        <span style={{ fontSize: '14px', color: '#666' }}>
          {schema.description || 'Enable this option'}
        </span>
      </label>
    )
  }
  
  if (t === 'array') {
    const arrayValue = Array.isArray(value) ? value.join(', ') : ''
    return (
      <textarea 
        style={textareaStyle}
        value={arrayValue} 
        onChange={e => {
          const trimmed = e.target.value.trim()
          if (!trimmed) {
            onChange([])
          } else {
            const items = trimmed.split(',').map(v => v.trim()).filter(Boolean)
            onChange(schema.items?.type === 'number' ? items.map(Number) : items)
          }
        }}
        placeholder={schema.description || `Enter comma-separated ${schema.items?.type || 'values'}`}
      />
    )
  }
  
  if (t === 'object') {
    return <SchemaForm schema={schema} value={value ?? {}} onChange={onChange} />
  }
  
  return <span style={{ color: '#999', fontStyle: 'italic' }}>Unsupported field type: {t}</span>
}

function SchemaForm({ schema, value, onChange }: any) {
  if (!schema?.properties) {
    return <div style={{ color: '#999', fontStyle: 'italic' }}>No configuration available</div>
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {Object.entries(schema.properties).map(([k, v]: any) => (
        <div key={k} style={{ display: 'grid', gap: '4px' }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {v.title || k}
            {schema.required?.includes(k) && (
              <span style={{ color: '#e74c3c', fontSize: '12px' }}>*</span>
            )}
          </label>
          {v.description && (
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              {v.description}
            </div>
          )}
          <Field 
            name={k} 
            schema={v} 
            value={value?.[k]} 
            onChange={(nv: any) => onChange({ ...value, [k]: nv })} 
          />
        </div>
      ))}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div style={{ 
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  )
}

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: '400px',
        width: '90%'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>{title}</h3>
        <p style={{ margin: '0 0 20px 0', color: '#666', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: '#e74c3c',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const [schemas, setSchemas] = useState<Record<string, JsonSchema>>({})
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:8787')
  const [key, setKey] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showConfirmSave, setShowConfirmSave] = useState(false)

  async function load() {
    if (!baseUrl.trim()) {
      setError('Please enter a relay URL')
      return
    }

    try {
      setBusy(true)
      setError(null)
      setSuccess(null)
      
      const headers: Record<string, string> = {}
      if (key.trim()) headers['x-admin-key'] = key.trim()
      
      const schRes = await fetch(`${baseUrl.trim()}/admin/schemas`, { headers })
      if (!schRes.ok) {
        throw new Error(`Failed to load schemas: ${schRes.status} ${schRes.statusText}`)
      }
      const sch = await schRes.json()
      
      const cfgRes = await fetch(`${baseUrl.trim()}/admin/config`, { headers })
      if (!cfgRes.ok) {
        throw new Error(`Failed to load config: ${cfgRes.status} ${cfgRes.statusText}`)
      }
      const cfg = await cfgRes.json()
      
      setSchemas(sch)
      setConfig(cfg)
      setSuccess('Configuration loaded successfully')
    } catch (e: any) {
      console.error('Load error:', e)
      const message = e?.message || 'Failed to load configuration'
      setError(message)
    } finally { 
      setBusy(false) 
    }
  }

  async function save() {
    if (!config) return

    try {
      setBusy(true)
      setError(null)
      setSuccess(null)
      
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      if (key.trim()) headers['x-admin-key'] = key.trim()
      
      const res = await fetch(`${baseUrl.trim()}/admin/config`, { 
        method: 'PUT', 
        headers, 
        body: JSON.stringify(config) 
      })
      
      if (!res.ok) {
        throw new Error(`Failed to save config: ${res.status} ${res.statusText}`)
      }
      
      setSuccess('Configuration saved successfully')
      setShowConfirmSave(false)
    } catch (e: any) {
      console.error('Save error:', e)
      const message = e?.message || 'Failed to save configuration'
      setError(message)
    } finally { 
      setBusy(false) 
    }
  }

  const pluginIds = useMemo(() => Object.keys(schemas), [schemas])

  const hasUnsavedChanges = config !== null

  // Clear success/error messages after 5 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        body {
          margin: 0;
          background-color: #f8f9fa;
        }
      `}</style>
      
      <div style={{ 
        padding: '24px', 
        fontFamily: 'system-ui, -apple-system, sans-serif', 
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: '#f8f9fa',
        minHeight: '100vh'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '24px'
        }}>
          <h1 style={{ 
            margin: '0 0 24px 0', 
            color: '#2c3e50',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            Nostr Relay Admin
          </h1>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '12px',
            marginBottom: '24px'
          }}>
            <input 
              placeholder="Relay URL (e.g., http://localhost:8787)" 
              value={baseUrl} 
              onChange={e => setBaseUrl(e.target.value)} 
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <input 
              type="password"
              placeholder="Admin Key (optional)" 
              value={key} 
              onChange={e => setKey(e.target.value)}
              style={{
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
            <button 
              onClick={load} 
              disabled={busy}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: busy ? '#bdc3c7' : '#3498db',
                color: 'white',
                cursor: busy ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {busy && <LoadingSpinner />}
              {busy ? 'Loading...' : 'Load Config'}
            </button>
            <button 
              onClick={() => setShowConfirmSave(true)} 
              disabled={!config || busy}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: (!config || busy) ? '#bdc3c7' : '#27ae60',
                color: 'white',
                cursor: (!config || busy) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {busy && <LoadingSpinner />}
              {busy ? 'Saving...' : 'Save Config'}
            </button>
          </div>

          {error && (
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c33',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: '#efe',
              border: '1px solid #cfc',
              borderRadius: '4px',
              color: '#363',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              <strong>Success:</strong> {success}
            </div>
          )}

          {config && (
            <div style={{ display: 'grid', gap: '32px' }}>
              <section>
                <h2 style={{ 
                  margin: '0 0 16px 0',
                  color: '#2c3e50',
                  fontSize: '20px',
                  fontWeight: '600',
                  borderBottom: '2px solid #ecf0f1',
                  paddingBottom: '8px'
                }}>
                  Relay Information
                </h2>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '20px',
                  borderRadius: '6px',
                  border: '1px solid #e9ecef'
                }}>
                  <SchemaForm 
                    schema={{ 
                      type: 'object', 
                      properties: {
                        name: { type: 'string', title: 'Relay Name', description: 'A human-readable name for your relay' },
                        description: { type: 'string', title: 'Description', description: 'Brief description of your relay' },
                        pubkey: { type: 'string', title: 'Relay Pubkey', description: 'Public key of the relay operator (optional)' },
                        contact: { type: 'string', title: 'Contact Info', description: 'Contact information for the relay operator' },
                        software: { type: 'string', title: 'Software', description: 'Software name and version' },
                        version: { type: 'string', title: 'Version', description: 'Version of the relay software' },
                        payments_url: { type: 'string', title: 'Payments URL', description: 'URL for payment information (Lightning, etc.)' },
                        supported_nips: { 
                          type: 'array', 
                          title: 'Supported NIPs', 
                          description: 'List of supported Nostr Implementation Possibilities (auto-populated)',
                          items: { type: 'number' } 
                        }
                      },
                      required: ['name']
                    }} 
                    value={config.relay} 
                    onChange={(v: any) => setConfig({ ...config, relay: v })} 
                  />
                </div>
              </section>

              <section>
                <h2 style={{ 
                  margin: '0 0 16px 0',
                  color: '#2c3e50',
                  fontSize: '20px',
                  fontWeight: '600',
                  borderBottom: '2px solid #ecf0f1',
                  paddingBottom: '8px'
                }}>
                  Plugin Configuration
                </h2>
                {pluginIds.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#7f8c8d',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #e9ecef'
                  }}>
                    No plugins available. Load configuration to see available plugins.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {pluginIds.map(pid => (
                      <div 
                        key={pid} 
                        style={{ 
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: 'white',
                          overflow: 'hidden'
                        }}
                      >
                        <div style={{
                          padding: '16px 20px',
                          backgroundColor: '#f8f9fa',
                          borderBottom: '1px solid #dee2e6'
                        }}>
                          <h3 style={{ 
                            margin: 0,
                            color: '#495057',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            {pid}
                          </h3>
                        </div>
                        <div style={{ padding: '20px' }}>
                          <SchemaForm 
                            schema={schemas[pid]} 
                            value={config.plugins?.[pid] ?? {}} 
                            onChange={(v: any) => setConfig({ 
                              ...config, 
                              plugins: { ...config.plugins, [pid]: v } 
                            })} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmSave}
        title="Save Configuration"
        message="Are you sure you want to save these changes? This will update the relay configuration and may affect how the relay operates."
        onConfirm={save}
        onCancel={() => setShowConfirmSave(false)}
      />
    </>
  )
}
