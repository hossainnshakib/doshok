import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import SanitizedHTML from "@/components/sanitized-html"
import type { Metadata } from "next"

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const page = await prisma.page.findUnique({
    where: { slug, status: "active" },
  })

  if (!page) notFound()

  return (
    <main className="container mx-auto container-px py-12 max-w-3xl">
      <article>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">{page.excerpt || "Page"}</p>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl mb-6">{page.title}</h1>
        <SanitizedHTML html={page.content} className="prose prose-sm max-w-none text-muted-foreground" />
      </article>
    </main>
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doshok.com"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = await prisma.page.findUnique({
    where: { slug, status: "active" },
    select: { title: true, seoTitle: true, seoDescription: true, seoImage: true },
  })

  if (!page) return { title: "Page Not Found" }

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription,
    alternates: { canonical: `${SITE_URL}/p/${slug}` },
    openGraph: page.seoImage
      ? { title: page.seoTitle || page.title, description: page.seoDescription ?? undefined, images: [{ url: page.seoImage }] }
      : undefined,
  }
}