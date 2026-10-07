import { useState } from "react"
import { JoinDialog } from "@/components/JoinForm"
import { Masthead } from "@/components/landing/Masthead"
import { HeroFrame } from "@/components/landing/HeroFrame"
import { Marquee } from "@/components/landing/Marquee"
import { LeadStory } from "@/components/landing/LeadStory"
import { FeatureIndex } from "@/components/landing/FeatureIndex"
import { PullQuote } from "@/components/landing/PullQuote"
import { QuickAnswers } from "@/components/landing/QuickAnswers"
import { SiteFooter } from "@/components/landing/SiteFooter"

const Index = () => {
  const [dlg, setDlg] = useState<"create" | "join" | null>(null)
  const create = () => setDlg("create")
  const join = () => setDlg("join")
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Masthead onCreate={create} onJoin={join} />
      <main>
        <HeroFrame onCreate={create} onJoin={join} />
        <Marquee />
        <LeadStory />
        <FeatureIndex />
        <PullQuote />
        <QuickAnswers />
      </main>
      <SiteFooter onCreate={create} onJoin={join} />
      <JoinDialog mode={dlg || "create"} open={dlg !== null} onOpenChange={(o) => !o && setDlg(null)} />
    </div>
  )
}

export default Index
