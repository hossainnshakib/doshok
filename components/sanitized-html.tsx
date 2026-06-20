"use client"

import { useMemo } from "react"

interface SanitizedHTMLProps {
  html: string
  className?: string
}

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html
  try {
    const doc = new DOMParser().parseFromString(html, "text/html")
    const stripTags = doc.querySelectorAll("script, iframe, object, embed, form, input, button, textarea, select, style, link")
    stripTags.forEach((el) => el.remove())
    const eventHandlers = [
      "onabort", "onautocomplete", "onautocompleteerror", "onblur", "oncancel",
      "oncanplay", "oncanplaythrough", "onchange", "onclick", "onclose",
      "oncontextmenu", "oncuechange", "ondblclick", "ondrag", "ondragend",
      "ondragenter", "ondragexit", "ondragleave", "ondragover", "ondragstart",
      "ondrop", "ondurationchange", "onemptied", "onended", "onerror", "onfocus",
      "oninput", "oninvalid", "onkeydown", "onkeypress", "onkeyup", "onload",
      "onloadeddata", "onloadedmetadata", "onloadstart", "onmousedown",
      "onmouseenter", "onmouseleave", "onmousemove", "onmouseout", "onmouseover",
      "onmouseup", "onmousewheel", "onpause", "onplay", "onplaying", "onprogress",
      "onratechange", "onreset", "onresize", "onscroll", "onseeked", "onseeking",
      "onselect", "onshow", "onsort", "onstalled", "onsubmit", "onsuspend",
      "ontimeupdate", "ontoggle", "onvolumechange", "onwaiting", "onwheel",
    ]
    doc.body.querySelectorAll("*").forEach((el) => {
      eventHandlers.forEach((h) => el.removeAttribute(h))
    })
    return doc.body.innerHTML
  } catch {
    return html
  }
}

export default function SanitizedHTML({ html, className }: SanitizedHTMLProps) {
  const clean = useMemo(() => sanitizeHtml(html), [html])
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
