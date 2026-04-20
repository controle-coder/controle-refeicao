import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  login: z.string().min(1),
  pin: z.string().min(4).max(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login: loginRaw, pin } = schema.parse(body)
    const login = loginRaw.trim().toLowerCase()

    const requisitante = await prisma.requisitante.findUnique({
      where: { login },
      include: { fazenda: true, turma: true },
    })

    if (!requisitante || !requisitante.ativo) {
      return Response.json({ error: 'Usuário ou PIN inválido' }, { status: 401 })
    }

    const pinValido = await bcrypt.compare(pin, requisitante.pinHash)
    if (!pinValido) {
      return Response.json({ error: 'Usuário ou PIN inválido' }, { status: 401 })
    }

    const session = await getSession()
    session.id = requisitante.id
    session.nome = requisitante.nome
    session.role = requisitante.role as 'ADMIN' | 'REQUISITANTE' | 'RESTAURANTE'
    session.fazendaId = requisitante.fazendaId
    session.turmaId = requisitante.turmaId
    session.restauranteId = requisitante.restauranteId ?? null
    await session.save()

    return Response.json({
      id: requisitante.id,
      nome: requisitante.nome,
      role: requisitante.role,
      fazendaId: requisitante.fazendaId,
      turmaId: requisitante.turmaId,
      restauranteId: requisitante.restauranteId ?? null,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
