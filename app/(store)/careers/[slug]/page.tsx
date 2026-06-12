import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { MapPin, Briefcase, Clock, Calendar, DollarSign, ArrowLeft, Mail } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await prisma.careerPost.findFirst({
    where: { slug, status: "Open" },
    select: { title: true, excerpt: true, department: true, location: true },
  })

  if (!post) return { title: "Job Not Found" }

  return {
    title: `${post.title} — ${post.department}`,
    description: post.excerpt || `${post.title} in ${post.department} at Doshok. Location: ${post.location}.`,
  }
}

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await prisma.careerPost.findFirst({
    where: { slug, status: "Open" },
  })

  if (!post) notFound()

  return (
    <main className="container mx-auto container-px py-12 max-w-3xl">
      <Link
        href="/careers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Careers
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">{post.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{post.department}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{post.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{post.employmentType}</span>
          {post.salaryRange && <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />{post.salaryRange}</span>}
          {post.deadline && (
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Deadline: {new Date(post.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
          )}
        </div>
      </header>

      {post.excerpt && (
        <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-2 border-foreground/10 pl-4">
          {post.excerpt}
        </p>
      )}

      <article className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-3">About the Role</h2>
          <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">{post.description}</div>
        </section>

        {post.responsibilities && (
          <section>
            <h2 className="text-lg font-bold mb-3">Responsibilities</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">{post.responsibilities}</div>
          </section>
        )}

        {post.requirements && (
          <section>
            <h2 className="text-lg font-bold mb-3">Requirements</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">{post.requirements}</div>
          </section>
        )}

        {post.benefits && (
          <section>
            <h2 className="text-lg font-bold mb-3">What We Offer</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">{post.benefits}</div>
          </section>
        )}
      </article>

      <div className="mt-12 rounded-2xl border border-dashed border-muted bg-muted/20 p-8 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
        <h3 className="text-base font-bold">Interested in this position?</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Send your CV and a brief introduction to <strong>careers@doshok.com</strong> with the job title in the subject line.
        </p>
      </div>
    </main>
  )
}