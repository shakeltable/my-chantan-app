import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Camera, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { BoardMock } from "./BoardMock"

const stage = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }
const rise = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } }

export function HeroStage({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  return (
    <section id="top" className="relative overflow-hidden px-5 pb-20 pt-32 md:px-8 md:pb-28 md:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[680px]" style={{ background: "radial-gradient(60% 55% at 50% 0%, hsl(var(--accent) / 0.2), transparent 72%)" }} />
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" style={{ backgroundImage: "radial-gradient(hsl(var(--foreground) / 0.16) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
      <div className="relative mx-auto max-w-5xl">
        <motion.div variants={stage} initial={reduced ? false : "hidden"} animate="show" className="mx-auto max-w-3xl text-center">
          <motion.h1 variants={rise} className="font-display text-[clamp(2.8rem,7vw,5.6rem)] leading-[1.02] tracking-[-0.035em]">
            <span className="block font-extrabold">{t("Think together")}</span>
            <span className="block bg-gradient-to-r from-foreground to-accent bg-clip-text font-extrabold text-transparent">{t("on one board.")}</span>
          </motion.h1>
          <motion.p variants={rise} className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            {t("A live whiteboard for teams, classes and friends. Draw, write, connect ideas and talk, right in the browser. A name and an email is all it takes to walk in.")}
          </motion.p>
          <motion.div variants={rise} className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={onCreate} className="group gap-2 rounded-full px-7">
              {t("Start a room")}<ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" onClick={onJoin} className="rounded-full px-7">{t("Join with a code")}</Button>
          </motion.div>
          <motion.p variants={rise} className="mt-5 text-sm text-muted-foreground">{t("No sign-up · Works in the browser · Four languages")}</motion.p>
        </motion.div>
        <motion.div initial={reduced ? false : { opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }} className="relative mt-14 md:mt-20">
          <BoardMock />
          <div className="rb-drift absolute -start-4 top-10 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold shadow-[0_14px_30px_-18px_hsl(var(--foreground)/0.5)] lg:flex">
            <Camera className="h-4 w-4 text-accent" />{t("Snapshots for everyone")}
          </div>
          <div className="rb-drift-b absolute -end-4 bottom-16 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold shadow-[0_14px_30px_-18px_hsl(var(--foreground)/0.5)] lg:flex">
            <FileSpreadsheet className="h-4 w-4 text-accent" />{t("Guest list to Google Sheets")}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
