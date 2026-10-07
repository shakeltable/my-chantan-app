import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { useTranslation } from 'react-i18next'

export function useRecorder() {
  const { t } = useTranslation()
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const rec = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const actx = useRef<AudioContext | null>(null)
  const timer = useRef(0)
  const t0 = useRef(0)

  const start = useCallback((canvas: HTMLCanvasElement, audio: MediaStream[]) => {
    try {
      if (typeof MediaRecorder === "undefined" || !(canvas as any).captureStream) throw new Error("unsupported")
      const tracks: MediaStreamTrack[] = [...(canvas as any).captureStream(24).getVideoTracks()]
      if (audio.length) {
        const ctx = new AudioContext()
        const dest = ctx.createMediaStreamDestination()
        audio.forEach((s) => ctx.createMediaStreamSource(new MediaStream(s.getAudioTracks())).connect(dest))
        actx.current = ctx
        tracks.push(...dest.stream.getAudioTracks())
      }
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
        .find((m) => MediaRecorder.isTypeSupported(m))
      const r = new MediaRecorder(new MediaStream(tracks), mime ? { mimeType: mime } : undefined)
      chunks.current = []
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
      r.start(1000)
      rec.current = r
      t0.current = Date.now(); setSeconds(0); setRecording(true)
      timer.current = window.setInterval(() => setSeconds(Math.round((Date.now() - t0.current) / 1000)), 1000)
      return true
    } catch {
      toast.error(t("متصفحك لا يدعم تسجيل الجلسة"))
      return false
    }
  }, [])

  const stop = useCallback(() => new Promise<{ blob: Blob; seconds: number; ext: string } | null>((resolve) => {
    const r = rec.current
    clearInterval(timer.current)
    setRecording(false)
    if (!r || r.state === "inactive") { resolve(null); return }
    r.onstop = () => {
      const type = r.mimeType || "video/webm"
      actx.current?.close(); actx.current = null
      resolve({ blob: new Blob(chunks.current, { type }), seconds: Math.round((Date.now() - t0.current) / 1000), ext: type.includes("mp4") ? "mp4" : "webm" })
      rec.current = null
    }
    r.stop()
  }), [])

  return { recording, seconds, start, stop }
}
