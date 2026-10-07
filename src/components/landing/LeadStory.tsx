import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from 'react-i18next'

const STATS = [
  { n: "∞", l: "مساحة سبورة" },
  { n: "25MB", l: "حجم الملف المسموح" },
  { n: "1", l: "نقرة للتسجيل" },
]

export function LeadStory() {
  const { t } = useTranslation()
  return (
    <section id="story" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <MotionReveal className="grid gap-10 md:grid-cols-[1.35fr_1fr]">
        <MotionItem className="grid gap-8 border-t-[1.5px] border-primary pt-5 sm:grid-cols-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-accent">{t("القصة الرئيسية")}</span>
            <h2 className="mt-2 text-3xl font-extrabold md:text-4xl">{t("سبورة بلا حدود، وخريطة تدلّك أين أنت")}</h2>
            <p className="mt-4 leading-8 text-muted-foreground">{t("مرِّر وكبّر وصغّر كما تشاء. الخريطة المصغّرة في الزاوية تُريك كل ما رسمه الفريق، وتنقلك إلى أي نقطة بلمسة. وترى مؤشّر كل مشارك وهو يتحرك باسمه ولونه.")}</p>
            <dl className="mt-auto grid grid-cols-3 border-t border-border pt-4">
              {STATS.map((s) => (
                <div key={s.l}><dt className="text-xl font-extrabold">{s.n}</dt><dd className="text-[11px] text-muted-foreground">{t(s.l)}</dd></div>
              ))}
            </dl>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-[6px]">
            <img src="/assets/lead.webp" alt={t("يد ترسم سهمًا على سبورة")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
          </div>
        </MotionItem>
        <div className="flex flex-col gap-8">
          {[
            { img: "/assets/s-call.webp", k: "الصوت والصورة", h: "كاميرا وميكروفون بإذن المسؤول", p: "المسؤول يقرّر من يتحدث، ويسحب الإذن في أي لحظة. وتستطيع مشاركة شاشتك مع الجميع." },
            { img: "/assets/s-files.webp", k: "الملفات", h: "صور ومستندات على اللوحة نفسها", p: "ارفع الصورة فتظهر على السبورة أمام الجميع، أما المستندات فتُحفظ وتُنزَّل لاحقًا." },
          ].map((s) => (
            <MotionItem key={s.h} className="grid grid-cols-[110px_1fr] gap-4 border-t border-border pt-5">
              <div className="relative h-28 overflow-hidden rounded-[4px]">
                <img src={s.img} alt={t(s.h)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
              </div>
              <div>
                <span className="text-xs font-bold text-accent">{t(s.k)}</span>
                <h3 className="mt-1 text-lg font-bold leading-snug">{t(s.h)}</h3>
                <p className="mt-1 text-sm leading-7 text-muted-foreground">{t(s.p)}</p>
              </div>
            </MotionItem>
          ))}
        </div>
      </MotionReveal>
    </section>
  )
}
