import React, { useEffect, useRef, useState } from 'react'

export default function Video({ src, onClose }: { src: string; onClose: () => void }) {
  const vref = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const v = vref.current
    if (!v) return
    const onErr = () => setError('This file may not be supported by your browser (MKV/codec).')
    v.addEventListener('error', onErr)
    return () => v.removeEventListener('error', onErr)
  }, [])

  return (
    <div>
      <div className="controls">
        <button className="btn" onClick={onClose}>Close</button>
        <a className="btn" href={src} target="_blank" rel="noreferrer">Open Direct</a>
      </div>
      <div className="video-wrap">
        <video ref={vref} src={src} controls playsInline preload="metadata" />
      </div>
      {error && <div className="small">{error}</div>}
    </div>
  )
}


