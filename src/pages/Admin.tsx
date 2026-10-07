import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { BarChart3, CircleDollarSign, ExternalLink, LogOut, Megaphone, Radar, ShieldCheck, UserCog } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdsManager } from "@/components/admin/AdsManager"
import { AnalyticsView } from "@/components/admin/AnalyticsView"
import { PixelsSettings } from "@/components/admin/PixelsSettings"
import { GoogleAdsSettings } from "@/components/admin/AdSettings"
import { AccountSettings } from "@/components/admin/AccountSettings"
import { useTranslation } from "react-i18next"

const isAdminUser = (u: any) => ["admin", "owner", "super"].includes(u?.app_metadata?.role)
type Tab = "analytics" | "ads" | "google" | "pixels" | "account"

export default function Admin() {
  const { t } = useTranslation()
  const [user, setUser] = useState<any>(null)
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState("")
  const [pw, setPw] = useState("")
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<Tab>("analytics")

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null) })
    return () => data.subscription.unsubscribe()
  }, [])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
      if (error) toast.error(t("بيانات الدخول غير صحيحة"))
      else if (!isAdminUser(data.user)) { toast.error(t("هذا الحساب لا يملك صلاحية الإدارة")); await supabase.auth.signOut() }
    } catch { toast.error(t("تعذّر تسجيل الدخول")) } finally { setBusy(false) }
  }

  if (!ready) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">{t("جارٍ التحميل…")}</div>

  if (!user || !isAdminUser(user)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-12">
        <ShieldCheck className="mb-3 h-8 w-8 text-accent" />
        <h1 className="text-3xl font-extrabold">{t("لوحة تحكم روم بورد")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("للمسؤول فقط: الإعلانات والإحصائيات والبيكسلات.")}</p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <Input dir="ltr" type="email" required placeholder={t("البريد الإلكتروني")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input dir="ltr" type="password" required placeholder={t("كلمة المرور")} value={pw} onChange={(e) => setPw(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy}>{busy ? t("جارٍ الدخول…") : t("دخول")}</Button>
        </form>
        <Link to="/" className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline">{t("العودة إلى الرئيسية")}</Link>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: JSX.Element }[] = [
    { id: "analytics", label: t("الإحصائيات"), icon: <BarChart3 className="h-4 w-4" /> },
    { id: "ads", label: t("الإعلانات"), icon: <Megaphone className="h-4 w-4" /> },
    { id: "google", label: t("Google AdSense"), icon: <CircleDollarSign className="h-4 w-4" /> },
    { id: "pixels", label: t("بيكسلات التتبع"), icon: <Radar className="h-4 w-4" /> },
    { id: "account", label: t("الحساب"), icon: <UserCog className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-[1.5px] border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <h1 className="text-lg font-extrabold">{t("لوحة تحكم روم بورد")}</h1>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/"><ExternalLink className="me-1 h-4 w-4" />{t("الموقع")}</Link></Button>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}><LogOut className="me-1 h-4 w-4" />{t("خروج")}</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
          {tabs.map((x) => (
            <button key={x.id} onClick={() => setTab(x.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${tab === x.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {x.icon}{x.label}
            </button>
          ))}
        </nav>
        {tab === "analytics" && <AnalyticsView />}
        {tab === "ads" && <AdsManager />}
        {tab === "google" && <GoogleAdsSettings />}
        {tab === "pixels" && <PixelsSettings />}
        {tab === "account" && <AccountSettings email={user.email || ""} />}
      </main>
    </div>
  )
}
