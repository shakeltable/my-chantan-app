import { PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from 'react-i18next'

export function SiteFooter({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  return (
    <footer className="border-t-[1.5px] border-primary">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2 text-xl font-extrabold"><PenTool className="h-5 w-5 text-accent" />{t("روم بورد")}</div>
          <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">{t("سبورة بيضاء تعاونية حيّة لكل فريق وصف وصديق. ارسم وتحدّث وشارك وسجّل، من أي مكان.")}</p>
          <div className="mt-5 flex gap-3">
            <Button onClick={onCreate}>{t("ابدأ غرفة جديدة")}</Button>
            <Button variant="outline" onClick={onJoin}>{t("انضم بكود")}</Button>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">{t("المنتج")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a className="transition-colors duration-150 hover:text-foreground" href="#features">{t("فهرس المزايا")}</a></li>
            <li><a className="transition-colors duration-150 hover:text-foreground" href="#story">{t("كيف تعمل")}</a></li>
            <li><a className="transition-colors duration-150 hover:text-foreground" href="#faq">{t("أسئلة سريعة")}</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-bold">{t("داخل الغرفة")}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t("الرسم والكتابة والأسهم")}</li><li>{t("الدردشة والمشاركة")}</li><li>{t("الكاميرا والميكروفون بإذن")}</li><li>{t("التسجيل والملفات")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {t("روم بورد. جميع الحقوق محفوظة.")}</div>
    </footer>
  )
}
