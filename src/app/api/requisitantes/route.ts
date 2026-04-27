import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const schema = z.object({
  nome: z.string().min(1),
  login: z.string().min(1),
  pin: z.string().min(4).max(6).regex(/^\d+$/, 'PIN deve conter apenas dígitos'),
  role: z.enum(['ADMIN', 'REQUISITANTE']).default('REQUISITANTE'),
  fazendaId: z.number().int().positive(),
  turmaId: z.number().int().positive(),
  contratoIds: z.array(z.number().int().positive()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const fazendaId = searchParams.get('fazendaId')
    const turmaId = searchParams.get('turmaId')

    const items = await prisma.requisitante.findMany({
      where: {
        ...(fazendaId ? { fazendaId: Number(fazendaId) } : {}),
        ...(turmaId ? { turmaId: Number(turmaId) } : {}),
      },
      include: { fazenda: true, turma: true, contratos: true },
      orderBy: { nome: 'asc' },
    })
    return Response.json(items.map((r) => ({ ...r, pinHash: undefined })))
  } catch (e: any) {
    return authError(e.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { pin, contratoIds, ...rest } = schema.parse(body)
    const pinHash = await bcrypt.hash(pin, 10)
    const item = await prisma.requisitante.create({
      data: {
        ...rest,
        pinHash,
        contratos: contratoIds?.length
          ? { connect: contratoIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { fazenda: true, turma: true, contratos: true },
    })
    return Response.json({ ...item, pinHash: undefined }, { status: 201 })
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    if ((e as any).code === 'P2002') {
      return Response.json({ error: 'Login já existe' }, { status: 409 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
