export function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function envOptional(name: string): string | undefined {
  return process.env[name] || undefined
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

export function requireStrongAuthSecret(): void {
  if (!isProduction()) return
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET must be at least 32 characters in production. " +
      "Generate one with: openssl rand -base64 32"
    )
  }
}
