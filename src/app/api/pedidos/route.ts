import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarPedido } from '@/lib/versioning'
import { getSession, authError, getGestorScope } from '@/lib/auth'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
  observacao: z.string().optional(),
})

const schema = z.object({
  // Usuário cadastrado
  requisitanteId: z.number().int().positive().optional(),
  fazendaId: z.number().int().positive().optional(),
  turmaId: z.number().int().positive().optional(),
  // Visitante (não cadastrado)
  nomeVisitante: z.string().min(1).optional(),
  sobrenomeVisitante: z.string().min(1).optional(),
  // Campos comuns
  restauranteId: z.number().int().positive(),
  dataRefeicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  itens: z.array(itemSchema).min(1),
  observacao: z.string().optional(),
}).refine(
  (d) =>
    (d.requisitanteId && d.fazendaId && d.turmaId) ||
    (d.nomeVisitante && d.sobrenomeVisitante),
  { message: 'Informe requisitanteId+fazendaId+turmaId ou nomeVisitante+sobrenomeVisitante' }
)

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.id) return authError('UNAUTHORIZED')

    const { searchParams } = new URL(request.url)
    const where: Record<string, unknown> = {}

    if (session.role === 'REQUISITANTE') {
      // Requisitante só vê os próprios pedidos
      where.requisitanteId = session.id
    } else if (session.role === 'RESTAURANTE') {
      // Restaurante só vê pedidos do seu restaurante
      where.restauranteId = session.restauranteId
    } else if (session.role === 'GESTOR') {
      // Gestor só vê pedidos vinculados ao(s) contrato(s) dele
      const scope = await getGestorScope(session.contratoIds ?? [])
      where.OR = [
        { restauranteId: { in: scope.restauranteIds } },
        { fazendaId: { in: scope.fazendaIds } },
        { turmaId: { in: scope.turmaIds } },
        { requisitanteId: { in: scope.requisitanteIds } },
      ]
    } else {
      // ADMIN pode filtrar livremente
      const restauranteId = searchParams.get('restauranteId')
      const fazendaId = searchParams.get('fazendaId')
      const turmaId = searchParams.get('turmaId')
      const requisitanteId = searchParams.get('requisitanteId')
      if (restauranteId) where.restauranteId = Number(restauranteId)
      if (fazendaId) where.fazendaId = Number(fazendaId)
      if (turmaId) where.turmaId = Number(turmaId)
      if (requisitanteId) where.requisitanteId = Number(requisitanteId)
    }

    const status = searchParams.get('status')
    if (status) where.status = status

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { id: true, nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
      orderBy: { criadoEm: 'desc' },
    })

    return Response.json(pedidos)
  } catch (e: any) {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = schema.parse(body)

    // Pedidos de requisitante cadastrado exigem autenticação
    if (data.requisitanteId) {
      const session = await getSession()
      if (!session.id) return authError('UNAUTHORIZED')
      // GESTOR não pode criar pedidos
      if (session.role === 'GESTOR') return authError('FORBIDDEN')
      // Requisitante só pode criar pedido para si mesmo
      if (session.role === 'REQUISITANTE' && data.requisitanteId !== session.id) {
        return authError('FORBIDDEN')
      }
    }

    const { pedido } = await criarPedido({
      restauranteId: data.restauranteId,
      fazendaId: data.fazendaId,
      turmaId: data.turmaId,
      requisitanteId: data.requisitanteId,
      nomeVisitante: data.nomeVisitante,
      sobrenomeVisitante: data.sobrenomeVisitante,
      dataRefeicao: new Date(data.dataRefeicao + 'T12:00:00.000Z'),
      itens: data.itens,
      observacao: data.observacao,
    })

    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: pedido.id },
      include: {
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { id: true, nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          include: { itens: true, criadoPor: { select: { id: true, nome: true } } },
        },
      },
    })

    return Response.json(pedidoCompleto, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    if (e.message === 'PEDIDO_DUPLICADO') {
      return Response.json({ error: 'Pedido duplicado — já existe um pedido idêntico criado há menos de 2 minutos' }, { status: 409 })
    }
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
