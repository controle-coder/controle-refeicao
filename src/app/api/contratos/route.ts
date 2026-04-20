import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  numero: z.string().optional(),
  descricao: z.string().optional(),
})

export async function GET() {
  try {
    await requireAdmin()
    const items = await prisma.contrato.findMany({
      orderBy: { nome: 'asc' },
      include: { _count: { select: { requisitantes: true } } },
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
    const item = await prisma.contrato.create({ data })
    return Response.json(item, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0].message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
