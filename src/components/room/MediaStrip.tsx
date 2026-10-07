import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Maximize2, MicOff, MonitorUp, X } from "lucide-react"
import { Avatar } from "./Avatar"
import type { Media } from "@/hooks/useMedia"
import type { Peer } from "@/lib/roomboard"
import { useTranslation } from 'react-i18next'

function Stream({ stream, muted, mirror, className }: { stream: MediaStream; muted?: boolean; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.srcObject = stream
    let cleanup: (() => void) | undefined
    const tryPlay = () => v.play().catch(() => {
      // the browser blocked sound until the first tap — start it on the very next click / key press
      if (cleanup) return
      const h = () => { v.play().then(() => cleanup?.()).catch(() => undefined) }
      document.addEventListener("pointerdown", h); document.addEventListener("keydown", h)
      cleanup = () => { document.removeEventListener("pointerdown", h); document.removeEventListener("keydown", h); cleanup = undefined }
    })
    tryPlay()
    const onAdd = () => { tryPlay() }
    stream.addEventListener("addtrack", onAdd)
    return () => { stream.removeEventListener("addtrack", onAdd); cleanup?.() }
  }, [stream])
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} style={mirror ? { transform: "scaleX(-1)" } : undefined} />
}

function ScreenView({ stream }: { stream: MediaStream }) {
  const { t } = useTranslation()
  const [wait, setWait] = useState(true)
  useEffect(() => {
    const tr = stream.getVideoTracks()[0]
    if (!tr) return
    const upd = () => setWait(tr.muted)
    upd()
    tr.addEventListener("mute", upd); tr.addEventListener("unmute", upd)
    return () => { tr.removeEventListener("mute", upd); tr.removeEventListener("unmute", upd) }
  }, [stream])
  return (
    <div className="relative min-h-0 flex-1 bg-black">
      <Stream stream={stream} className="h-full w-full object-contain" />
      {wait && <div className="absolute inset-0 flex items-center justify-center bg-black text-sm font-semibold text-white/80">{t("بانتظار صورة الشاشة…")}</div>}
    </div>
  )
}

function Tile({ peer, stream, local }: { peer: { name: string; color: string }; stream: MediaStream; local?: boolean }) {
  const { t } = useTranslation()
  const hasVideo = stream.getVideoTracks().length > 0
  const hasAudio = stream.getAudioTracks().length > 0
  return (
    <div className="relative h-[84px] w-[112px] shrink-0 overflow-hidden rounded-[6px] border-[1.5px] border-border bg-foreground/90 md:h-[96px] md:w-[128px]">
      <Stream stream={stream} muted={local} mirror={local} className={hasVideo ? "h-full w-full object-cover" : "pointer-events-none absolute h-px w-px opacity-0"} />
      {!hasVideo && <div className="flex h-full items-center justify-center"><Avatar name={peer.name} color={peer.color} size={40} /></div>}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-semibold text-white">
        <span className="truncate">{local ? t("أنت") : t(peer.name)}</span>
        {!hasAudio && <MicOff className="h-3 w-3 shrink-0 opacity-80" />}
      </div>
    </div>
  )
}

export function MediaStrip({ media, peers, meId }: { media: Media; peers: Peer[]; meId: string }) {
  const { t } = useTranslation()
  const [hidden, setHidden] = useState<string | null>(null)
  const screenBox = useRef<HTMLDivElement>(null)
  const me = peers.find((p) => p.id === meId)
  const remoteTiles = peers.filter((p) => p.id !== meId && media.remote[p.id]?.av)
  const sharer = peers.find((p) => p.id !== meId && media.remote[p.id]?.screen)
  const screenStream = sharer ? media.remote[sharer.id]?.screen : undefined
  const showScreen = screenStream && hidden !== sharer!.id

  // a new share always opens automatically for everyone watching
  useEffect(() => {
    setHidden(null)
    if (sharer) toast.info(t("{{name}} بدأ مشاركة شاشته", { name: sharer.name }))
  }, [sharer?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {(media.localAV || remoteTiles.length > 0) && (
        <div className="absolute inset-x-16 top-3 z-20 flex justify-center gap-2 overflow-x-auto px-1 py-1">
          {media.localAV && me && <Tile peer={me} stream={media.localAV} local />}
          {remoteTiles.map((p) => <Tile key={p.id} peer={p} stream={media.remote[p.id]!.av!} />)}
        </div>
      )}
      {media.screenOn && (
        <div className="absolute top-3 end-3 z-20 flex items-center gap-2 rounded-[6px] border-[1.5px] border-accent bg-background px-3 py-1.5 text-xs font-semibold">
          <MonitorUp className="h-4 w-4 text-accent" /> {t("أنت تشارك شاشتك")}
        </div>
      )}
      {screenStream && sharer && hidden === sharer.id && (
        <button onClick={() => setHidden(null)}
          className="absolute top-3 end-3 z-20 flex items-center gap-2 rounded-[6px] border-[1.5px] border-accent bg-background px-3 py-1.5 text-xs font-semibold transition-colors duration-150 hover:bg-muted">
          <MonitorUp className="h-4 w-4 text-accent" /> {t("عرض شاشة {{name}}", { name: sharer.name })}
        </button>
      )}
      {showScreen && sharer && (
        <div ref={screenBox} className="absolute inset-x-6 bottom-20 top-32 z-10 flex flex-col overflow-hidden rounded-[8px] border-[1.5px] border-border bg-foreground shadow-lg md:inset-x-[12%]">
          <div className="flex items-center justify-between bg-background px-3 py-1.5 text-sm font-semibold">
            <span className="flex items-center gap-2"><MonitorUp className="h-4 w-4 text-accent" />{sharer.name} {t("يشارك شاشته")}</span>
            <span className="flex items-center gap-1">
              <button aria-label={t("ملء الشاشة")} title={t("ملء الشاشة")} onClick={() => screenBox.current?.requestFullscreen?.().catch(() => undefined)} className="rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><Maximize2 className="h-4 w-4" /></button>
              <button aria-label={t("إخفاء")} onClick={() => setHidden(sharer.id)} className="rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><X className="h-4 w-4" /></button>
            </span>
          </div>
          <ScreenView stream={screenStream!} />
        </div>
      )}
    </>
  )
}
