import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from 'react-i18next'

export function PullQuote() {
  const { t } = useTranslation()
  return (
    <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8 md:pb-24">
      <MotionReveal className="grid items-stretch gap-8 border-y-[1.5px] border-primary py-10 md:grid-cols-[1fr_320px]">
        <MotionItem className="flex flex-col justify-center">
          <span className="text-xs font-bold text-accent">{t("رأي مستخدمة")}</span>
          <blockquote className="mt-3 text-2xl font-bold leading-[1.7] md:text-4xl">
            {t("«شرحتُ المعادلة على السبورة، وأعطيتُ الطالبة إذن الميكروفون لتجيب، ثم عدتُ للتسجيل في المساء.»")}
          </blockquote>
          <p className="mt-5 text-sm text-muted-foreground">{t("ليلى المنصوري — معلمة رياضيات، الدار البيضاء، المغرب")}</p>
        </MotionItem>
        <MotionItem className="relative min-h-[220px] overflow-hidden rounded-[6px]">
          <img src="/assets/s-audio.webp" alt={t("ميكروفون وسماعات على مكتب")} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
        </MotionItem>
      </MotionReveal>
    </section>
  )
}
