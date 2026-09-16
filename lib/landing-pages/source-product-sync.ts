/**
 * @deprecated Source product sync has been removed.
 * Landing pages now own their items independently.
 * This module is kept as a no-op for import compatibility.
 */
export async function ensureSourceProductLinked(_landingPageId: string): Promise<boolean> {
  return false
}

export async function backfillAllSourceProducts(): Promise<number> {
  return 0
}
