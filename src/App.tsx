import React, { useEffect, useState } from 'react'
import { fetchCatalog, fetchPlayUrl, type Folder, type FileItem, type CatalogResponse } from './api'
import Video from './Video'
import PlayerShaka from './PlayerShaka'

type Crumb = { label: string; prefix: string }

export default function App() {
  const [prefix, setPrefix] = useState<string>('')
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [playingUrl, setPlayingUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const load = async (pfx: string) => {
    setLoading(true)
    try {
      const data: CatalogResponse = await fetchCatalog(pfx)
      setFolders(data.folders || [])
      setFiles(data.files || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(prefix) }, [prefix])

  const openFolder = (p: string) => {
    setCrumbs(prev => [...prev, { label: (p.replace(/\/$/, '').split('/').pop() || 'root'), prefix: p }])
    setPrefix(p)
  }

  const up = () => {
    if (crumbs.length === 0) return
    const next = crumbs.slice(0, -1)
    setCrumbs(next)
    setPrefix(next[next.length - 1]?.prefix || '')
  }

  const jumpTo = (i: number) => {
    const next = crumbs.slice(0, i + 1)
    setCrumbs(next)
    setPrefix(next[i].prefix)
  }

  const play = async (key: string) => {
    const url = await fetchPlayUrl(key)
    setPlayingUrl(url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="header">DBZPortal</div>
      <div className="container">
        <div className="breadcrumbs">
          <span>Path:</span>
          <button className="btn" onClick={() => { setCrumbs([]); setPrefix('') }}>root</button>
          {crumbs.map((c, i) => (
            <button className="btn" key={i} onClick={() => jumpTo(i)}>{' / '}{c.label}</button>
          ))}
        </div>

        {playingUrl && (
          playingUrl.endsWith('.m3u8')
            ? <PlayerShaka src={playingUrl} onClose={() => setPlayingUrl(null)} />
            : <Video src={playingUrl} onClose={() => setPlayingUrl(null)} />
        )}

        <div className="controls">
          <button className="btn" onClick={up} disabled={crumbs.length === 0}>⬆️ Up</button>
          <button className="btn" onClick={() => load(prefix)} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>

        <h3>Folders</h3>
        <div className="grid">
          {folders.length === 0 && <div className="small">No subfolders</div>}
          {folders.map(f => (
            <div key={f.prefix} className="card" onClick={() => openFolder(f.prefix)}>
              <div>📁 {f.name}</div>
              <div className="meta">{f.prefix}</div>
            </div>
          ))}
        </div>

        <h3 style={{ marginTop: 18 }}>Files</h3>
        <div className="grid">
          {files.length === 0 && <div className="small">No files</div>}
          {files.map(fi => (
            <div key={fi.key} className="card" onClick={() => play(fi.key)}>
              <div>🎬 {fi.name}</div>
              <div className="meta">{(fi.size / (1024*1024)).toFixed(1)} MB</div>
              <span className="badge">MKV</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}


