import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "404 – Page Not Found | Doshok",
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="mx-auto max-w-md text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-950 text-2xl font-black text-white">
          D
        </span>
        <h1 className="mt-8 text-6xl font-black tracking-tight text-neutral-900">404</h1>
        <p className="mt-4 text-lg leading-relaxed text-neutral-600">
          Looks like this page wandered off. Let&apos;s get you back on track.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
          >
            Go Home
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            Shop Products
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-900 transition-colors hover:bg-neutral-50"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
