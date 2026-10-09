import { useState } from "react"
import { JoinDialog } from "@/components/JoinForm"
import { Masthead } from "@/components/landing/Masthead"
import { HeroStage } from "@/components/landing/HeroStage"
import { Capabilities } from "@/components/landing/Capabilities"
import { Flow } from "@/components/landing/Flow"
import { Privacy } from "@/components/landing/Privacy"
import { Faq } from "@/components/landing/Faq"
import { SiteFooter } from "@/components/landing/SiteFooter"

const Index = () => {
  const [dlg, setDlg] = useState<"create" | "join" | null>(null)
  const create = () => setDlg("create")
  const join = () => setDlg("join")
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Masthead onCreate={create} onJoin={join} />
      <main>
        <HeroStage onCreate={create} onJoin={join} />
        <Capabilities />
        <Flow />
        <Privacy />
        <Faq />
      </main>
      <SiteFooter onCreate={create} onJoin={join} />
      <JoinDialog mode={dlg || "create"} open={dlg !== null} onOpenChange={(o) => !o && setDlg(null)} />
    </div>
  )
}

export default Index
