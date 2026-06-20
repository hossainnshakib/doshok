import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdminRole } from "@/lib/permissions"

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl
  const session = request.auth

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session?.user || !isAdminRole(session.user.role) || session.user.isActive === false) {
      return NextResponse.redirect(new URL("/admin/login", request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith("/account")) {
    if (!session?.user) {
      const loginUrl = new URL("/auth/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (isAdminRole(session.user.role)) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
}
