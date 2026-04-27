import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host')?.toLowerCase()

  if (host === 'www.quarriva.com' || host === 'slabhub.vercel.app') {
    const url = request.nextUrl.clone()
    url.hostname = 'quarriva.com'
    url.protocol = 'https'
    url.port = ''
    return NextResponse.redirect(url, 308)
  }

  // Protect /admin and /crm routes with cookie-based admin auth.
  if (pathname.startsWith('/admin') || pathname.startsWith('/crm')) {
    if (pathname.startsWith('/admin/login')) {
      return NextResponse.next()
    }
    const session = request.cookies.get('admin_session')
    if (session?.value === 'valid') {
      return NextResponse.next()
    }
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/:path*',
}
