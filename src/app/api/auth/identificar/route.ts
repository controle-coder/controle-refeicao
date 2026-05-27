import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  requisitanteId: z.number().int().positive(),
  pin: z.string().min(4).max(6).regex(/^\d+$/),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requisitanteId, pin } = schema.parse(body)

    const requisitante = await prisma.requisitante.findUnique({
      where: { id: requisitanteId, ativo: true, role: 'REQUISITANTE' },
    })

    if (!requisitante) {
      return Response.json({ error: 'PIN inválido' }, { status: 401 })
    }

    const pinValido = await bcrypt.compare(pin, requisitante.pinHash)
    if (!pinValido) {
      return Response.json({ error: 'PIN inválido' }, { status: 401 })
    }

    const session = await getSession()
    session.id = requisitante.id
    session.nome = requisitante.nome
    session.role = 'REQUISITANTE'
    session.fazendaId = requisitante.fazendaId
    session.turmaId = requisitante.turmaId
    await session.save()

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Lista pública de requisitantes (sem dados sensíveis)
export async function GET() {
  const requisitantes = await prisma.requisitante.findMany({
    where: { ativo: true, role: 'REQUISITANTE' },
    select: { id: true, nome: true, fazenda: { select: { nome: true } }, turma: { select: { nome: true } } },
    orderBy: { nome: 'asc' },
  })
  return Response.json(requisitantes)
}
