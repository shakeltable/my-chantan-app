import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Ban, KeyRound, Loader2, PenTool } from "lucide-react"
import { emailHash, getAccess, isBanned, isUnlocked, markUnlocked, verifyPassword, type AccessRow } from "@/lib/roomAccess"
import type { Profile, RoomRow } from "@/lib/roomboard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from 'react-i18next'

type St = "loading" | "open" | "locked" | "banned" | "error"

function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-12">
      <Link to="/" className="mb-8 flex items-center gap-2 font-bold"><PenTool className="h-5 w-5 text-accent" />{t("روم بورد")}</Link>
      {children}
    </div>
  )
}

/** Blocks the room until the visitor is allowed in: not banned, and (if protected) knows the password. */
export function AccessGate({ room, profile, children }: { room: RoomRow; profile: Profile; children: ReactNode }) {
  const { t } = useTranslation()
  const [st, setSt] = useState<St>("loading")
  const [row, setRow] = useState<AccessRow | null>(null)
  const [pw, setPw] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const load = useCallback(async () => {
    setSt("loading")
    if (profile.id === room.admin_id) return setSt("open")
    try {
      const r = await getAccess(room.code)
      setRow(r)
      const eh = await emailHash(room.code, profile.email)
      if (isBanned(r, profile.id, eh)) return setSt("banned")
      setSt(r && !isUnlocked(r) ? "locked" : "open")
    } catch { setSt("error") }
  }, [room.code, room.admin_id, profile.id, profile.email])

  useEffect(() => { load() }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!row) return
    setBusy(true); setErr("")
    try {
      if (await verifyPassword(row, pw)) { markUnlocked(row); setSt("open") }
      else setErr("كلمة السر غير صحيحة")
    } finally { setBusy(false) }
  }

  if (st === "open") return <>{children}</>
  if (st === "loading") return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  if (st === "banned") return (
    <Shell>
      <Ban className="mb-3 h-8 w-8 text-destructive" />
      <h1 className="text-2xl font-extrabold">{t("لا يمكنك دخول هذه الغرفة")}</h1>
      <p className="mt-2 text-muted-foreground">{t("قام مسؤول الغرفة بحظرك منها.")}</p>
      <Button asChild className="mt-6 self-start"><Link to="/">{t("العودة إلى الرئيسية")}</Link></Button>
    </Shell>
  )

  if (st === "error") return (
    <Shell>
      <h1 className="text-2xl font-extrabold">{t("تعذّر التحقق من الغرفة")}</h1>
      <p className="mt-2 text-muted-foreground">{t("تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.")}</p>
      <Button className="mt-6 self-start" onClick={load}>{t("إعادة المحاولة")}</Button>
    </Shell>
  )

  return (
    <Shell>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-accent"><KeyRound className="h-4 w-4" />{t("غرفة محمية")}</p>
      <h1 className="mb-2 mt-1 text-2xl font-extrabold">«{room.name}{t("» تحتاج كلمة سر")}</h1>
      <p className="mb-5 text-muted-foreground">{t("اطلب كلمة السر من مسؤول الغرفة ثم أدخلها للدخول.")}</p>
      <form onSubmit={submit} className="space-y-3">
        <Input type="password" dir="ltr" autoFocus autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t("كلمة السر")} className="text-start" />
        {err && <p className="rounded-[6px] border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">{t(err)}</p>}
        <Button type="submit" className="w-full" disabled={busy || !pw}>
          {busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{t("دخول الغرفة")}
        </Button>
      </form>
    </Shell>
  )
}
