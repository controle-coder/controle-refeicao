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

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas totalmente públicas
  if (
    pathname.startsWith('/pedido-visitante') ||
    pathname.startsWith('/api/restaurantes') ||
    pathname.startsWith('/api/fazendas') ||
    pathname.startsWith('/api/turmas') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/identificar'
  ) {
    return addSecurityHeaders(NextResponse.next())
  }

  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, sessionOptions)

  // Área de pedidos: role REQUISITANTE ou ADMIN
  if (pathname.startsWith('/pedidos') || pathname.startsWith('/api/pedidos')) {
    if (!session.id || (session.role !== 'REQUISITANTE' && session.role !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return addSecurityHeaders(response)
  }

  // Área do restaurante: role RESTAURANTE
  if (pathname.startsWith('/restaurante') || pathname.startsWith('/api/restaurante')) {
    if (!session.id || session.role !== 'RESTAURANTE') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return addSecurityHeaders(response)
  }

  // Área do gestor: role GESTOR (somente leitura)
  if (pathname.startsWith('/gestor') || pathname.startsWith('/api/relatorios')) {
    if (!session.id || (session.role !== 'GESTOR' && session.role !== 'ADMIN')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return addSecurityHeaders(response)
  }

  // Admin: role ADMIN
  if (!session.id || session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return addSecurityHeaders(response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
