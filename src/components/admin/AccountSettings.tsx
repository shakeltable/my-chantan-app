import { useState } from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/chantan-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTranslation } from "react-i18next"

/** Change the admin's own login email and password. */
export function AccountSettings({ email }: { email: string }) {
  const { t } = useTranslation()
  const [newEmail, setNewEmail] = useState("")
  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [busyE, setBusyE] = useState(false)
  const [busyP, setBusyP] = useState(false)

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = newEmail.trim()
    if (!/^\S+@\S+\.\S+$/.test(v)) return toast.error(t("بريد إلكتروني غير صحيح"))
    setBusyE(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: v })
      if (error) toast.error(t("تعذّر تغيير البريد: {{msg}}", { msg: error.message }))
      else { toast.success(t("تم طلب تغيير البريد. إذا وصلتك رسالة تأكيد فافتح الرابط فيها لإتمام التغيير.")); setNewEmail("") }
    } catch { toast.error(t("تعذّر تغيير البريد")) } finally { setBusyE(false) }
  }

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 8) return toast.error(t("كلمة المرور يجب ألا تقل عن 8 أحرف"))
    if (pw !== pw2) return toast.error(t("كلمتا المرور غير متطابقتين"))
    setBusyP(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) toast.error(t("تعذّر تغيير كلمة المرور: {{msg}}", { msg: error.message }))
      else { toast.success(t("تم تغيير كلمة المرور")); setPw(""); setPw2("") }
    } catch { toast.error(t("تعذّر تغيير كلمة المرور")) } finally { setBusyP(false) }
  }

  return (
    <div className="grid max-w-3xl gap-8 md:grid-cols-2">
      <form onSubmit={changeEmail} className="space-y-3">
        <h3 className="font-bold">{t("بريد الدخول")}</h3>
        <p className="text-sm text-muted-foreground">{t("البريد الحالي")}: <span dir="ltr" className="font-semibold text-foreground">{email}</span></p>
        <Input dir="ltr" type="email" required placeholder={t("البريد الجديد")} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        <Button type="submit" disabled={busyE}>{t("تغيير البريد")}</Button>
      </form>
      <form onSubmit={changePw} className="space-y-3">
        <h3 className="font-bold">{t("كلمة المرور")}</h3>
        <Input dir="ltr" type="password" required placeholder={t("كلمة المرور الجديدة")} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        <Input dir="ltr" type="password" required placeholder={t("أعد كتابة كلمة المرور")} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
        <Button type="submit" disabled={busyP}>{t("تغيير كلمة المرور")}</Button>
      </form>
    </div>
  )
}
