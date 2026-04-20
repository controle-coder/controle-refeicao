import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  nome: z.string().min(1),
  login: z.string().min(2),
  pin: z.string().min(4).max(6).regex(/^\d+$/, 'PIN deve conter apenas números'),
  restauranteId: z.number().int().positive(),
})

export async function GET() {
  try {
    await requireAdmin()
    const usuarios = await prisma.requisitante.findMany({
      where: { role: 'RESTAURANTE' },
      include: { restaurante: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    })
    return Response.json(usuarios)
  } catch (e: any) {
    return authError(e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const data = schema.parse(body)

    const loginNorm = data.login.trim().toLowerCase()
    const pinHash = await bcrypt.hash(data.pin, 10)

    const usuario = await prisma.requisitante.create({
      data: {
        nome: data.nome,
        login: loginNorm,
        pinHash,
        role: 'RESTAURANTE',
        restauranteId: data.restauranteId,
      },
      include: { restaurante: { select: { id: true, nome: true } } },
    })

    return Response.json(usuario, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    if (e.code === 'P2002') return Response.json({ error: 'Login já existe' }, { status: 409 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
