import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password || !user.isActive) return null

        const isValid = await compare(credentials.password as string, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerifiedAt: user.phoneVerifiedAt,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.isActive = (user as { isActive?: boolean }).isActive ?? true
        token.id = user.id
        token.firstName = (user as { firstName?: string | null }).firstName
        token.lastName = (user as { lastName?: string | null }).lastName
        token.phone = (user as { phone?: string | null }).phone
        token.phoneVerifiedAt = (user as { phoneVerifiedAt?: Date | null }).phoneVerifiedAt?.toISOString() ?? null
      }
      if (typeof token.id === "string") {
        const fresh = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, isActive: true, emailVerified: true, phoneVerifiedAt: true },
        })
        token.role = fresh?.role ?? token.role
        token.isActive = fresh?.isActive ?? false
        token.emailVerified = fresh?.emailVerified?.toISOString() ?? null
        token.phoneVerifiedAt = fresh?.phoneVerifiedAt?.toISOString() ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.isActive = token.isActive as boolean
        session.user.id = token.id as string
        session.user.firstName = token.firstName as string | null | undefined
        session.user.lastName = token.lastName as string | null | undefined
        session.user.phone = token.phone as string | null | undefined
        session.user.emailVerified = token.emailVerified ? new Date(token.emailVerified as string) : null
        session.user.phoneVerifiedAt = token.phoneVerifiedAt ? new Date(token.phoneVerifiedAt as string) : null
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
})
