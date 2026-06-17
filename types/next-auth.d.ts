import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    isActive?: boolean
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    emailVerified?: Date | null
    phoneVerifiedAt?: Date | null
  }
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      isActive?: boolean
      firstName?: string | null
      lastName?: string | null
      phone?: string | null
      emailVerified?: Date | null
      phoneVerifiedAt?: Date | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    isActive?: boolean
    id?: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    emailVerified?: string | null
    phoneVerifiedAt?: string | null
  }
}
