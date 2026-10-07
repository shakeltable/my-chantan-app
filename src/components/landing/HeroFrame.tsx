import { useRef } from "react"
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MotionItem, MotionReveal } from "@/components/MotionReveal"
import { useTranslation } from 'react-i18next'

const FACTS = [
  { n: "∞", l: "مساحة للرسم والتنقل" },
  { n: "0", l: "حسابات معقّدة" },
  { n: "6", l: "أدوات وألوان جاهزة" },
]

export function HeroFrame({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const y = useTransform(scrollYProgress, [0, 1], ["0%", reduced ? "0%" : "10%"])
  return (
    <section id="top" className="px-4 pb-10 pt-20 md:px-8 md:pt-24">
      <div className="mx-auto max-w-7xl">
        <MotionReveal delay={0}>
          <MotionItem className="flex items-center justify-between border-b border-border pb-3 text-xs font-semibold text-muted-foreground md:text-sm">
            <span className="text-accent">{t("سبورة تعاونية حيّة · بدون حساب · بالعربية")}</span>
            <span className="hidden sm:inline">{t("غرف مباشرة للفرق والصفوف والأصدقاء")}</span>
          </MotionItem>
        </MotionReveal>
        <div ref={ref} className="relative mt-5 h-[58vh] min-h-[380px] overflow-hidden rounded-[6px] md:h-[64vh]">
          <motion.img src="/assets/hero.webp" alt={t("فريق يتعاون حول سبورة بيضاء")} style={{ y }} className="absolute -top-[6%] left-0 h-[112%] w-full object-cover" />
          <div className="absolute inset-0 bg-primary/25 mix-blend-multiply" />
          <span className="absolute start-4 top-4 h-6 w-6 border-s-2 border-t-2 border-background/90" />
          <span className="absolute end-4 top-4 h-6 w-6 border-e-2 border-t-2 border-background/90" />
        </div>
        <MotionReveal delay={0.15} className="relative -mt-24 grid items-end gap-6 md:-mt-28 md:grid-cols-[minmax(0,640px)_1fr]">
          <div className="border-[1.5px] border-border bg-background p-6 md:ms-10 md:p-8">
            <MotionItem><h1 className="text-[clamp(2.2rem,4vw,3.5rem)] font-extrabold">{t("السبورة التي تجمع الجميع في غرفة واحدة")}</h1></MotionItem>
            <MotionItem><p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">{t("ارسم وانسخ الأفكار واكتب وارفع الملفات، بينما يتابع الجميع على نفس اللوحة لحظة بلحظة. اكتب اسمك وبريدك فقط وادخل.")}</p></MotionItem>
            <MotionItem className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={onCreate} className="gap-2">{t("ابدأ غرفة جديدة")}<ArrowLeft className="h-4 w-4" /></Button>
              <Button size="lg" variant="outline" onClick={onJoin}>{t("انضم بكود")}</Button>
            </MotionItem>
          </div>
          <dl className="hidden grid-cols-3 divide-x divide-x-reverse divide-border border-y border-border md:grid">
            {FACTS.map((f) => (
              <MotionItem key={f.l} className="px-4 py-4">
                <dt className="text-3xl font-extrabold">{f.n}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{t(f.l)}</dd>
              </MotionItem>
            ))}
          </dl>
        </MotionReveal>
      </div>
    </section>
  )
}
