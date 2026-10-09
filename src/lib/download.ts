/** Download a file from another address (a plain link would just open it). */
export async function downloadUrl(url: string, name: string) {
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error("bad")
    const blob = await r.blob()
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob); a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  } catch { window.open(url, "_blank") }
}

/** Rows as tab-separated text — pastes straight into Google Sheets cells. */
export function rowsToTsv(rows: string[][]) {
  return rows.map((r) => r.map((c) => String(c ?? "").replace(/[\t\r\n]+/g, " ")).join("\t")).join("\n")
}

export function downloadCsv(name: string, rows: string[][]) {
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }))
  a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
