import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Always allow /admin/login
  if (pathname.startsWith('/admin/login')) {
    return NextResponse.next()
  }

  // Check for valid session cookie
  const session = request.cookies.get('admin_session')
  if (session?.value === 'valid') {
    return NextResponse.next()
  }

  // Redirect to login
  const loginUrl = new URL('/admin/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/admin/:path*'],
}
