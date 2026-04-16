import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({ nome: z.string().min(1) })

export async function GET() {
  try {
    await requireAuth()
    const items = await prisma.fazenda.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    })
    return Response.json(items)
  } catch (e: any) {
    return authError(e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = schema.parse(body)
    const item = await prisma.fazenda.create({ data })
    return Response.json(item, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
