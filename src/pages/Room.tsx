import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Loader2, PenTool } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { getProfile, normalizeCode, type Profile, type RoomRow } from "@/lib/roomboard"
import { JoinForm } from "@/components/JoinForm"
import { RecordingsList } from "@/components/room/FilesPanel"
import { Button } from "@/components/ui/button"
import RoomView from "@/components/room/RoomView"
import { AccessGate } from "@/components/room/AccessGate"
import { useTranslation } from 'react-i18next'

type State = { s: "loading" } | { s: "missing" } | { s: "ended"; room: RoomRow } | { s: "ok"; room: RoomRow }

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2 font-bold"><PenTool className="h-5 w-5 text-accent" />{t("روم بورد")}</Link>
      {children}
    </div>
  )
}

export default function Room() {
  const { t } = useTranslation()
  const params = useParams()
  const code = normalizeCode(params.code || "")
  const [state, setState] = useState<State>({ s: "loading" })
  const [profile, setProfile] = useState<Profile | null>(getProfile())

  useEffect(() => {
    let dead = false
    ;(async () => {
      const { data: room } = await supabase.from("rooms").select("*").eq("code", code).maybeSingle()
      if (dead) return
      if (!room) return setState({ s: "missing" })
      const { data: ev } = await supabase.from("room_events").select("id").eq("room_code", code).eq("type", "ended").limit(1)
      if (dead) return
      setState(ev && ev.length ? { s: "ended", room: room as RoomRow } : { s: "ok", room: room as RoomRow })
    })()
    return () => { dead = true }
  }, [code])

  useEffect(() => { document.title = t("روم بورد — غرفة {{code}}", { code }) }, [code, t])

  if (state.s === "loading") return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  if (state.s === "missing") return (
    <Shell>
      <h1 className="text-2xl font-extrabold">{t("لم نجد هذه الغرفة")}</h1>
      <p className="mt-2 text-muted-foreground">{t("تحقّق من الكود أو الرابط الذي وصلك، أو أنشئ غرفة جديدة.")}</p>
      <Button asChild className="mt-6 self-start"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
    </Shell>
  )

  if (state.s === "ended") return (
    <Shell>
      <p className="text-sm font-semibold text-accent">{t("انتهت الجلسة")}</p>
      <h1 className="mt-1 text-2xl font-extrabold">{t("أُغلقت الغرفة «")}{state.room.name}»</h1>
      <p className="mb-5 mt-2 text-muted-foreground">{t("يمكنك مشاهدة التسجيلات المحفوظة لهذه الغرفة:")}</p>
      <div className="rounded-[8px] border-[1.5px] border-border"><RecordingsList code={code} refreshKey={0} /></div>
      <Button asChild className="mt-6 self-start"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
    </Shell>
  )

  if (!profile) return (
    <Shell>
      <p className="text-sm font-semibold text-accent">{t("دعوة إلى غرفة «")}{state.room.name}»</p>
      <h1 className="mb-6 mt-1 text-2xl font-extrabold">{t("انضم في ثوانٍ")}</h1>
      <JoinForm mode="join" fixedCode={code} onDone={() => setProfile(getProfile())} />
    </Shell>
  )

  return <AccessGate room={state.room} profile={profile}><RoomView room={state.room} profile={profile} /></AccessGate>
}
