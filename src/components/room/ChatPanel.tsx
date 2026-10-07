import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { supabase } from "@/lib/chantan-db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Session } from "@/hooks/useRoomSession"
import { useTranslation } from 'react-i18next'
import { AdSlot } from "@/components/AdSlot"

interface Msg { id: string; author_id: string; author_name: string; body: string; created_at: string }

export function ChatPanel({ code, me, session }: { code: string; me: { id: string; name: string }; session: Session }) {
  const { t } = useTranslation()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const end = useRef<HTMLDivElement>(null)
  const { on, send } = session

  const add = (m: Msg) => setMsgs((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]))

  useEffect(() => {
    let dead = false
    supabase.from("messages").select("id,author_id,author_name,body,created_at").eq("room_code", code)
      .order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { if (!dead && data) setMsgs((l) => { const ids = new Set(data.map((d: any) => d.id)); return [...data.reverse() as Msg[], ...l.filter((x) => !ids.has(x.id))] }) })
    const off = on("chat", (m: Msg) => add(m))
    return () => { dead = true; off() }
  }, [code, on])

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [msgs.length])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    const m: Msg = { id: crypto.randomUUID(), author_id: me.id, author_name: me.name, body, created_at: new Date().toISOString() }
    add(m); setText(""); send("chat", m)
    supabase.from("messages").insert({ id: m.id, room_code: code, author_id: m.author_id, author_name: m.author_name, body }).then(({ error }) => { if (error) console.warn(error.message) })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {msgs.length === 0 && <p className="pt-8 text-center text-sm text-muted-foreground">{t("لا رسائل بعد. ابدأ المحادثة مع المشاركين.")}</p>}
        {msgs.map((m) => {
          const mine = m.author_id === me.id
          return (
            <div key={m.id} className={mine ? "flex flex-col items-start" : "flex flex-col items-end"}>
              <div className="mb-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{mine ? t("أنت") : m.author_name}</span>
                <span>{new Date(m.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className={`max-w-[88%] whitespace-pre-wrap break-words rounded-[8px] border-[1.5px] px-3 py-2 text-sm ${mine ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <AdSlot placement="chat" roomCode={code} />
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("اكتب رسالة…")} maxLength={1000} />
        <Button type="submit" size="icon" aria-label={t("إرسال")}><Send className="h-4 w-4 rtl:-scale-x-100" /></Button>
      </form>
    </div>
  )
}
