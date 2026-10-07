import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { X } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { BoardStore, type Tool } from "@/lib/boardStore"
import { colorFor, ensureSession, uploadToRoom, type Peer, type Profile, type RoomRow } from "@/lib/roomboard"
import { banPerson, createAccess, emailHash, getAccess } from "@/lib/roomAccess"
import { Ban } from "lucide-react"
import { useRoomSession } from "@/hooks/useRoomSession"
import { useBoardSync } from "@/hooks/useBoardSync"
import { useMedia } from "@/hooks/useMedia"
import { useRecorder } from "@/hooks/useRecorder"
import { useIsMobile } from "@/hooks/use-mobile"
import { BoardTabs } from "./BoardTabs"
import { Whiteboard } from "./Whiteboard"
import { Toolbar } from "./Toolbar"
import { Minimap } from "./Minimap"
import { MediaStrip } from "./MediaStrip"
import { RoomTopBar, type PanelId } from "./RoomTopBar"
import { MobileDock } from "./MobileDock"
import { ChatPanel } from "./ChatPanel"
import { PeoplePanel } from "./PeoplePanel"
import { FilesPanel, RecordingsList } from "./FilesPanel"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from 'react-i18next'
import { AdSlot } from "@/components/AdSlot"
import { AdPopup } from "@/components/AdPopup"
import { trackEvent } from "@/lib/tracking"

const MAX_FILE = 25 * 1024 * 1024

export default function RoomView({ room, profile }: { room: RoomRow; profile: Profile }) {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const isAdmin = profile.id === room.admin_id
  const color = colorFor(profile.id)
  const meta = useMemo<Peer>(() => ({
    id: profile.id, name: profile.name, country: profile.country, isAdmin, color,
    cam: false, mic: false, screen: false, joinedAt: Date.now(),
  }), [profile.id, profile.name, profile.country, isAdmin, color])
  const me = useMemo(() => ({ id: profile.id, name: profile.name, color }), [profile.id, profile.name, color])

  const session = useRoomSession(room.code, meta)
  const store = useMemo(() => new BoardStore(), [room.code])
  const actions = useBoardSync(store, session, room.code, me, room.admin_id)
  const media = useMedia({ session, code: room.code, meId: profile.id, myName: profile.name, adminId: room.admin_id, isAdmin, peers: session.peers })
  const rec = useRecorder()
  const mobile = useIsMobile()
  const [boardId, setBoardId] = useState(store.boardId)
  const [, setBoardsVer] = useState(0)
  useEffect(() => store.subscribe(() => { setBoardId(store.boardId); setBoardsVer(store.boardVer) }), [store])
  // tell everyone which board this person is on (shown on the tabs and in the participants list)
  useEffect(() => { session.updateMeta({ board: boardId }) }, [boardId, session.updateMeta])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [tool, setTool] = useState<Tool>("pen")
  const [pen, setPen] = useState("#1f2937")
  const [width, setWidth] = useState(4)
  const [panel, setPanel] = useState<PanelId>(() => (window.innerWidth >= 1024 ? "chat" : null))
  const [recOn, setRecOn] = useState(false)
  const [ended, setEnded] = useState(false)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [filesKey, setFilesKey] = useState(0)
  const [font, setFont] = useState("Vazirmatn")
  const [textSize, setTextSize] = useState(28)
  const [banned, setBanned] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem("roomboard:bg") === "dark")
  const toggleDark = () => setDark((d) => { localStorage.setItem("roomboard:bg", d ? "light" : "dark"); return !d })
  const canEdit = media.canEdit

  useEffect(() => {
    ;(async () => {
      await ensureSession(profile)
      // the creator owns the room's access settings (password / bans)
      if (isAdmin) { const r = await getAccess(room.code); if (!r) await createAccess(room.code) }
    })().catch(() => undefined)
  }, [profile, isAdmin, room.code])
  useEffect(() => { trackEvent("room_enter", { room_code: room.code }) }, [room.code])
  useEffect(() => { emailHash(room.code, profile.email).then((eh) => session.updateMeta({ eh })) }, [room.code, profile.email, session.updateMeta])

  const banUser = async (p: Peer) => {
    session.send("kick", { from: profile.id, id: p.id })
    try { await banPerson(room.code, p.id, p.eh); toast.success(t("تم حظر {{name}} نهائيًا", { name: p.name })) }
    catch { toast.error(t("تعذّر حفظ الحظر، حاول مجددًا")) }
  }

  useEffect(() => {
    const offs = [
      session.on("room-end", (m: any) => { if (m.from === room.admin_id) { media.stopAll(); setEnded(true) } }),
      session.on("kick", (m: any) => { if (m.from === room.admin_id && m.id === profile.id) { media.stopAll(); setBanned(true) } }),
      session.on("rec-state", (m: any) => { if (m.from === room.admin_id) setRecOn(!!m.on) }),
      session.on("files-changed", () => setFilesKey((k) => k + 1)),
      session.on("peer-join", () => { if (isAdmin && recOn) session.send("rec-state", { from: profile.id, on: true }) }),
    ]
    return () => offs.forEach((f) => f())
  }, [session.on, session.send, room.admin_id, isAdmin, recOn, profile.id, media.stopAll])

  const onUpload = async (file: File) => {
    if (!canEdit) return toast.info(t("السبورة للعرض فقط — اطلب إذن التحرير من المسؤول"))
    if (file.size > MAX_FILE) return toast.error(t("حجم الملف أكبر من 25 ميغابايت"))
    const tid = toast.loading(t("جارٍ رفع الملف…"))
    try {
      if (!(await ensureSession(profile))) throw new Error(t("تعذّر تفعيل الرفع الآن"))
      const url = await uploadToRoom(room.code, file)
      const c = store.worldCenter()
      if (file.type.startsWith("image/")) {
        const dim = await new Promise<{ w: number; h: number }>((res) => {
          const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res({ w: 400, h: 300 }); im.src = url
        })
        const k = Math.min(1, 480 / dim.w, 360 / dim.h)
        const w = dim.w * k, h = dim.h * k
        actions.addObj({ id: crypto.randomUUID(), type: "image", url, x: c.x - w / 2, y: c.y - h / 2, w, h, color: "#000", width: 1, by: profile.id })
      } else {
        actions.addObj({ id: crypto.randomUUID(), type: "file", url, name: file.name, x: c.x - 120, y: c.y - 32, w: 240, h: 64, color: "#000", width: 1, by: profile.id })
      }
      await supabase.from("room_files").insert({ room_code: room.code, name: file.name, url, mime: file.type, size: file.size, uploader: profile.name })
      session.send("files-changed", {}); setFilesKey((k) => k + 1)
      toast.success(t("تمت إضافة الملف إلى السبورة"), { id: tid })
    } catch (e: any) {
      toast.error(t(e.message) || t("فشل رفع الملف"), { id: tid })
    }
  }

  const toggleRec = async () => {
    if (!rec.recording) {
      if (!canvasRef.current) return
      store.keepAlive = true
      if (!rec.start(canvasRef.current, media.getAudioStreams())) { store.keepAlive = false; return }
      setRecOn(true); session.send("rec-state", { from: profile.id, on: true })
      return
    }
    store.keepAlive = false
    setRecOn(false); session.send("rec-state", { from: profile.id, on: false })
    const res = await rec.stop()
    if (!res) return
    const tid = toast.loading(t("جارٍ حفظ التسجيل…"))
    try {
      if (!(await ensureSession(profile))) throw new Error(t("تعذّر حفظ التسجيل الآن"))
      const url = await uploadToRoom(room.code, res.blob, res.ext)
      const name = t("تسجيل {{name}} — {{date}}", { name: room.name, date: new Date().toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) })
      const { error } = await supabase.from("recordings").insert({ room_code: room.code, name, url, duration_s: res.seconds, size: res.blob.size, created_by: profile.name })
      if (error) throw new Error(error.message)
      session.send("files-changed", {}); setFilesKey((k) => k + 1)
      toast.success(t("حُفظ التسجيل في تبويب «الملفات والتسجيلات»"), { id: tid })
    } catch (e: any) { toast.error(t(e.message) || t("فشل حفظ التسجيل"), { id: tid }) }
  }

  const endRoom = async () => {
    setConfirmEnd(false)
    if (rec.recording) await toggleRec()
    await supabase.from("room_events").insert({ room_code: room.code, type: "ended", data: {} })
    session.send("room-end", { from: profile.id })
    await media.stopAll()
    setEnded(true)
  }

  const toolbarProps = {
    tool, setTool, color: pen, setColor: setPen, width, setWidth, isAdmin, canEdit,
    onRequestEdit: () => media.request("edit"), onUndo: actions.undo, onClear: actions.clearAll, onPickFile: () => fileRef.current?.click(),
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(`${window.location.origin}/room/${room.code}`)
    toast.success(t("نُسخ رابط الدعوة"))
  }

  if (banned) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
        <Ban className="mb-3 h-8 w-8 text-destructive" />
        <h1 className="text-3xl font-extrabold">{t("تم حظرك من هذه الغرفة")}</h1>
        <p className="mt-2 text-muted-foreground">{t("قام مسؤول الغرفة بحظرك، لذلك لن تتمكن من الدخول إليها مرة أخرى.")}</p>
        <Button asChild className="mt-6 self-start"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
      </div>
    )
  }

  if (ended) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-12">
        <p className="text-sm font-semibold text-accent">{t("انتهت الجلسة")}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{t("أُغلقت الغرفة «")}{room.name}»</h1>
        <p className="mt-2 text-muted-foreground">{t("يمكنك الرجوع إلى التسجيلات المحفوظة أدناه، أو العودة إلى الصفحة الرئيسية.")}</p>
        <div className="mt-6 rounded-[8px] border-[1.5px] border-border"><RecordingsList code={room.code} refreshKey={filesKey} /></div>
        <Button asChild className="mt-6 self-start"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-background">
      <RoomTopBar roomName={room.name} code={room.code} isAdmin={isAdmin} media={media} recOn={recOn} recSeconds={rec.seconds}
        onToggleRec={toggleRec} panel={panel} setPanel={setPanel} count={session.peers.length}
        onCopy={copyLink} onEnd={() => setConfirmEnd(true)} onLeave={() => nav("/")} dark={dark} onToggleDark={toggleDark} mobile={mobile} />
      <AdSlot placement="top" roomCode={room.code} />
      <AdPopup roomCode={room.code} />
      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
         <div className="relative min-h-0 flex-1">
          <Whiteboard store={store} actions={actions} me={me} tool={tool} color={pen} setColor={setPen} width={width}
            font={font} setFont={setFont} textSize={textSize} setTextSize={setTextSize} canvasRef={canvasRef} onDropFile={onUpload} canEdit={canEdit} dark={dark} isAdmin={isAdmin} />
          {!mobile && <Toolbar {...toolbarProps} />}
          {(!mobile || !panel) && <Minimap store={store} compact={mobile} />}
          <MediaStrip media={media} peers={session.peers} meId={profile.id} />
          <input ref={fileRef} type="file" hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = "" }} />
         </div>
         <BoardTabs boards={store.boardList} current={boardId} peers={session.peers} meId={profile.id} canEdit={canEdit} isAdmin={isAdmin}
           onSwitch={(id) => store.switchBoard(id)} onAdd={() => actions.addBoard(t("لوحة {{n}}", { n: store.boardList.length + 1 }))}
           onRename={actions.renameBoard} onRemove={actions.removeBoard} />
         {mobile && (
           <MobileDock media={media} isAdmin={isAdmin} recOn={recOn} onToggleRec={toggleRec} panel={panel} setPanel={setPanel}
             count={session.peers.length} dark={dark} onToggleDark={toggleDark}>
             <Toolbar {...toolbarProps} horizontal />
           </MobileDock>
         )}
        </div>
        {panel && (
          <aside className="fixed inset-x-0 bottom-0 z-40 flex h-[58dvh] flex-col rounded-t-[14px] border-t-[1.5px] border-border bg-background shadow-2xl md:static md:z-auto md:h-auto md:w-80 md:shrink-0 md:rounded-none md:border-s-[1.5px] md:border-t-0 md:shadow-none">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
              <h3 className="text-sm font-bold">{panel === "chat" ? t("الدردشة") : panel === "people" ? t("المشاركون") : t("الملفات والتسجيلات")}</h3>
              <button aria-label={t("إغلاق")} onClick={() => setPanel(null)} className="rounded-[4px] p-1 transition-colors duration-150 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1">
              {panel === "chat" && <ChatPanel code={room.code} me={me} session={session} />}
              {panel === "people" && <PeoplePanel peers={session.peers} meId={profile.id} isAdmin={isAdmin} media={media} roomCode={room.code} onBan={banUser} boards={store.boardList} onGoto={(id) => store.switchBoard(id)} />}
              {panel === "files" && <FilesPanel code={room.code} refreshKey={filesKey} />}
            </div>
          </aside>
        )}
      </div>
      <AdSlot placement="bottom" roomCode={room.code} />
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader className="text-start">
            <AlertDialogTitle>{t("إنهاء الجلسة للجميع؟")}</AlertDialogTitle>
            <AlertDialogDescription>{t("سيُخرَج جميع المشاركين وتُغلق الغرفة. تبقى السبورة والملفات والتسجيلات محفوظة.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel>{t("تراجع")}</AlertDialogCancel>
            <AlertDialogAction onClick={endRoom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("إنهاء الجلسة")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
