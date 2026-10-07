import { useEffect, useState } from "react"
import { KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { getAccess, setRoomPassword } from "@/lib/roomAccess"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from 'react-i18next'

/** Admin-only: set, change or remove the room password. People already inside are never kicked. */
export function AccessAdmin({ code }: { code: string }) {
  const { t } = useTranslation()
  const [has, setHas] = useState<boolean | null>(null)
  const [pw, setPw] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => { getAccess(code).then((r) => setHas(!!r?.pw_hash)).catch(() => setHas(false)) }, [code])

  const run = async (value: string) => {
    setBusy(true)
    try {
      await setRoomPassword(code, value)
      setHas(!!value); setPw("")
      toast.success(value ? t("تم حفظ كلمة السر. من هم داخل الغرفة يبقون فيها دون انقطاع") : t("أُزيلت الحماية. الغرفة مفتوحة بالكود"))
    } catch (e: any) {
      toast.error(e.message === "forbidden" ? t("هذا الجهاز ليس صاحب إعدادات هذه الغرفة") : t("تعذّر الحفظ، حاول مجددًا"))
    } finally { setBusy(false) }
  }

  return (
    <div className="border-t border-border p-4">
      <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-accent">
        {has ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}{t("كلمة سر الغرفة")}
      </h4>
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        {has === null ? t("جارٍ التحميل…") : has ? t("الغرفة محمية. يمكنك تغيير كلمة السر دون إخراج أحد من الداخل.") : t("الغرفة مفتوحة لكل من يملك الكود. أضف كلمة سر لحمايتها.")}
      </p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (pw.length >= 4) run(pw) }}>
        <div className="relative flex-1">
          <KeyRound className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" dir="ltr" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} maxLength={64}
            placeholder={has ? t("كلمة سر جديدة") : t("كلمة سر (4 أحرف فأكثر)")} className="h-9 ps-8 text-start" />
        </div>
        <Button type="submit" size="sm" className="h-9" disabled={busy || pw.length < 4}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : has ? t("تغيير") : t("حماية")}
        </Button>
      </form>
      {has && (
        <Button variant="ghost" size="sm" className="mt-2 h-8 px-2 text-xs text-destructive" disabled={busy} onClick={() => run("")}>{t("إزالة كلمة السر")}</Button>
      )}
    </div>
  )
}
