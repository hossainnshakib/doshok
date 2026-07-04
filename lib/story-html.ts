import { decode } from "he"

const BLOCK_RE = /<(\/?)(?:h[1-6]|ul|ol|li|blockquote|pre|table|hr|div|p)[\s>]/i

export function processStoryContent(raw: string): string {
  // Step 1: decode HTML entities (&lt;h1&gt; → <h1>)
  let html = decode(raw)

  // Step 2: unwrap block-level elements from <p> tags
  // e.g. <p><h1>...</h1></p> → <h1>...</h1>
  // Use non-greedy match to handle multiple paragraphs
  html = html.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner) => {
    if (BLOCK_RE.test(inner)) return inner
    return match
  })

  // Step 3: remove empty <p> tags left behind
  html = html.replace(/<p>\s*<\/p>/gi, "")

  // Step 4: strip dangerous tags (script, iframe, form, etc.)
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "")
  html = html.replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
  html = html.replace(/<object[\s\S]*?<\/object>/gi, "")
  html = html.replace(/<embed[\s\S]*?<\/embed>/gi, "")
  html = html.replace(/<form[\s\S]*?<\/form>/gi, "")
  html = html.replace(/<input[\s\S]*?>/gi, "")
  html = html.replace(/<button[\s\S]*?<\/button>/gi, "")
  html = html.replace(/<textarea[\s\S]*?<\/textarea>/gi, "")
  html = html.replace(/<select[\s\S]*?<\/select>/gi, "")
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "")
  html = html.replace(/<link[\s\S]*?>/gi, "")

  // Step 5: strip event handler attributes
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")

  return html
}
