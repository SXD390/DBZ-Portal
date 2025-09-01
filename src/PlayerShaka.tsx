import React, { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui.js'
import 'shaka-player/dist/controls.css'

export default function PlayerShaka({ src, onClose }: { src: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current!
    const video = document.createElement('video')
    video.className = 'shaka-video'
    video.controls = true
    video.playsInline = true
    // IMPORTANT: allow cross-origin text tracks when using native <track>
    video.crossOrigin = 'anonymous'
    videoRef.current = video

    container.innerHTML = ''
    container.appendChild(video)

    const player = new shaka.Player(video)
    const ui = new (shaka as any).ui.Overlay(player, container, video)
    ui.getControls()

    // Prefer English automatically
    player.configure({ preferredAudioLanguage: 'eng', preferredTextLanguage: 'eng' })

    const onError = (e: any) => {
      const msg = e?.detail?.message || e?.detail || e?.toString?.() || 'Playback error'
      // eslint-disable-next-line no-console
      console.error('SHAKA ERROR:', e)
      setErr(String(msg))
    }
    player.addEventListener('error', onError)

    let destroyed = false
    ;(async () => {
      try {
        await player.load(src)

        // Try to attach sidecar VTT next to master.m3u8 (…/subs.vtt)
        const subsUrl = guessSidecarVtt(src)
        if (subsUrl && (await urlExists(subsUrl))) {
          const anyPlayer: any = player as any
          const addText =
            (typeof anyPlayer.addTextTrack === 'function' && anyPlayer.addTextTrack) ||
            (typeof anyPlayer.addTextTrackAsync === 'function' && anyPlayer.addTextTrackAsync)

          if (addText) {
            // Some builds expose addTextTrackAsync instead of addTextTrack
            await addText.call(player, subsUrl, 'eng', 'subtitles', 'text/vtt', '', 'English')
            if (typeof anyPlayer.setTextTrackVisibility === 'function') {
              anyPlayer.setTextTrackVisibility(true)
            } else {
              // Older versions: via UI controls
              try { (ui as any).getControls()?.setTextTrackVisibility?.(true) } catch {}
            }
          } else {
            // Fallback: native <track> (crossOrigin on <video> is required for cross-site)
            const track = document.createElement('track')
            track.kind = 'subtitles'
            track.label = 'English'
            track.srclang = 'en'
            track.src = subsUrl
            track.default = true
            video.appendChild(track)
            try {
              const tt = (video as any).textTracks
              if (tt && tt.length > 0) tt[0].mode = 'showing'
            } catch {}
          }
        }
      } catch (e) {
        if (!destroyed) onError(e)
      }
    })()

    return () => {
      destroyed = true
      try { player.destroy() } catch {}
      try { if (container.contains(video)) container.removeChild(video) } catch {}
    }
  }, [src])

  return (
    <div>
      <div className="controls">
        <button className="btn" onClick={onClose}>Close</button>
        <a className="btn" href={src} target="_blank" rel="noreferrer">Open Direct</a>
      </div>
      <div className="video-wrap" ref={containerRef} />
      {err && <div className="small">{err}</div>}
    </div>
  )
}

/** If URL ends with /master.m3u8, return same folder /subs.vtt */
function guessSidecarVtt(masterUrl: string): string | null {
  try {
    const u = new URL(masterUrl)
    if (u.pathname.endsWith('/master.m3u8')) {
      u.pathname = u.pathname.replace(/\/master\.m3u8$/, '/subs.vtt')
      return u.toString()
    }
  } catch {}
  return null
}

/** HEAD (then GET) to check existence with CORS */
async function urlExists(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'HEAD', mode: 'cors' })
    if (r.ok) return true
  } catch {}
  try {
    const r2 = await fetch(url, { method: 'GET', mode: 'cors' })
    return r2.ok
  } catch {
    return false
  }
}
