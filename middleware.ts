import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect /admin/* routes with cookie-based auth
  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return NextResponse.next()
    }
    const session = request.cookies.get('admin_session')
    if (session?.value === 'valid') {
      return NextResponse.next()
    }
    const loginUrl = new URL('/admin/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // /crm routes are protected by NextAuth (handled in server components via auth())
  // The redirect to /login is done in the page components themselves
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/crm/:path*'],
}
