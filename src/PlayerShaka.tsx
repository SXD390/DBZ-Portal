import React, { useEffect, useRef, useState } from 'react'
import shaka from 'shaka-player/dist/shaka-player.ui.js'
import 'shaka-player/dist/controls.css'

export default function PlayerShaka({ src, onClose }: { src: string; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let destroyed = false
    ;(async () => {
      await waitForCastApi(1500)

      const container = containerRef.current!
      const video = document.createElement('video')
      video.className = 'shaka-video'
      video.controls = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'
      videoRef.current = video

      container.innerHTML = ''
      container.appendChild(video)

      const player = new shaka.Player(video)
      const ui = new (shaka as any).ui.Overlay(player, container, video)

      ui.configure({
        castReceiverAppId: 'CC1AD845',
        addCastButton: true,
      })

      player.configure({ preferredAudioLanguage: 'eng', preferredTextLanguage: 'eng' })

      const onError = (e: any) => {
        const msg = e?.detail?.message || e?.detail || e?.toString?.() || 'Playback error'
        // eslint-disable-next-line no-console
        console.error('SHAKA ERROR:', e)
        if (!destroyed) setErr(String(msg))
      }

      player.addEventListener('error', onError)

      try {
        await player.load(src)

        const subsUrl = guessSidecarVtt(src)
        if (subsUrl && (await urlExists(subsUrl))) {
          const anyPlayer: any = player as any
          const addText =
            (typeof anyPlayer.addTextTrack === 'function' && anyPlayer.addTextTrack) ||
            (typeof anyPlayer.addTextTrackAsync === 'function' && anyPlayer.addTextTrackAsync)

          if (addText) {
            await addText.call(player, subsUrl, 'eng', 'subtitles', 'text/vtt', '', 'English')
            if (typeof anyPlayer.setTextTrackVisibility === 'function') {
              anyPlayer.setTextTrackVisibility(true)
            } else {
              try { (ui as any).getControls()?.setTextTrackVisibility?.(true) } catch {}
            }
          } else {
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
        onError(e)
      }

      return () => {
        destroyed = true
        try { (player as any).destroy?.() } catch {}
        try { if (container.contains(video)) container.removeChild(video) } catch {}
      }
    })()

    return () => { /* cleanup done in inner async */ }
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

function waitForCastApi(timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    const win = window as any
    if (win.cast && win.cast.framework) return resolve()
    const t0 = Date.now()
    const int = setInterval(() => {
      if (win.cast && win.cast.framework) {
        clearInterval(int); resolve()
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(int); resolve()
      }
    }, 50)
  })
}

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
