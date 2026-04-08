'use client'

import { useCallback, useRef, useState } from 'react'
import type { Translations } from '@/lib/i18n'

interface Props {
  onFiles: (files: File[]) => void
  loading: boolean
  t: Translations
  isPro?: boolean
}

const ACCEPTED = '.pdf,.csv,.txt,image/*'
const ACCEPT_MIME = /\.(pdf|csv|txt|png|jpe?g|gif|webp|bmp)$/i

export default function UploadZone({ onFiles, loading, t }: Props) {
  const [dragging, setDragging]   = useState(false)
  const [pending,  setPending]    = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const valid = Array.from(incoming).filter(f => ACCEPT_MIME.test(f.name))
    if (!valid.length) return
    setPending(prev => {
      const names = new Set(prev.map(f => f.name))
      return [...prev, ...valid.filter(f => !names.has(f.name))]
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [addFiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const removeFile = (name: string) => setPending(p => p.filter(f => f.name !== name))

  const handleAnalyze = () => {
    if (pending.length) { onFiles(pending); setPending([]) }
  }

  const hasPending = pending.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label
        style={{
          display: 'block', width: '100%',
          border: `2px dashed ${dragging ? '#818cf8' : hasPending ? '#4338ca' : '#475569'}`,
          borderRadius: 16, padding: hasPending ? '24px 32px' : '56px 32px',
          textAlign: 'center', cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1,
          background: dragging ? 'rgba(99,102,241,0.08)' : hasPending ? 'rgba(67,56,202,0.06)' : 'transparent',
          transition: 'all 0.2s',
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }} accept={ACCEPTED}
          multiple onChange={handleChange} disabled={loading} />

        {!hasPending ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 17, color: '#cbd5e1', fontWeight: 500 }}>{t.uploadTitle}</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>{t.uploadSubtitle}</p>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#818cf8' }}>
            + {t.uploadMore}
          </p>
        )}
      </label>

      {/* File list */}
      {hasPending && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pending.map(f => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'rgba(30,41,59,0.7)', border: '1px solid #334155', borderRadius: 10 }}>
              <span style={{ fontSize: 16 }}>{fileIcon(f.name)}</span>
              <span style={{ flex: 1, color: '#e2e8f0', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>{fmtSize(f.size)}</span>
              {!loading && (
                <button onClick={e => { e.preventDefault(); removeFile(f.name) }}
                  style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{
              marginTop: 4, padding: '12px 0', borderRadius: 12, border: 'none',
              background: loading ? '#334155' : '#6366f1', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {t.uploadAnalyze} ({pending.length} {pending.length === 1 ? 'file' : 'files'})
          </button>
        </div>
      )}
    </div>
  )
}

function fileIcon(name: string) {
  if (/\.pdf$/i.test(name))  return '📕'
  if (/\.csv$/i.test(name))  return '📊'
  if (/\.txt$/i.test(name))  return '📝'
  return '🖼️'
}

function fmtSize(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(0)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}
