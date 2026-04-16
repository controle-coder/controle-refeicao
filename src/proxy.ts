import { NextRequest, NextResponse } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from '@/lib/auth'

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'pedidos-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Tudo em /pedidos e APIs de pedidos são públicos — sem autenticação
  if (
    pathname.startsWith('/pedidos') ||
    pathname.startsWith('/api/pedidos') ||
    pathname.startsWith('/api/restaurantes') ||
    pathname.startsWith('/api/fazendas') ||
    pathname.startsWith('/api/turmas') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/identificar'
  ) {
    return NextResponse.next()
  }

  // Admin exige sessão com role ADMIN
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  if (!session.id || session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
