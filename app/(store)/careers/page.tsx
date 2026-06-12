import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { MapPin, Briefcase, Clock } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the Doshok team. We are building meaningful fashion in Bangladesh.",
}

export default async function CareersPage() {
  const posts = await prisma.careerPost.findMany({
    where: { status: "Open" },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="container mx-auto container-px py-12">
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Careers</p>
        <h1 className="text-3xl font-black tracking-tight">Join the Doshok team.</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          We are building something meaningful in Bangladeshi fashion. If you are passionate about style, craft, and community, we would love to hear from you.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted bg-muted/20 p-16 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
          <h2 className="text-lg font-semibold text-muted-foreground">No open positions</h2>
          <p className="mt-1.5 text-sm text-muted-foreground/60">Check back soon. We are always growing.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/careers/${post.slug}`}
              className="group block rounded-2xl border border-border bg-background p-6 transition-all hover:border-foreground/10 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold group-hover:text-primary transition-colors">{post.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5" />
                      {post.department}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {post.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {post.employmentType}
                    </span>
                  </div>
                  {post.excerpt && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
                {post.deadline && (
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Deadline</p>
                    <p className="mt-0.5 text-sm font-medium">{new Date(post.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}