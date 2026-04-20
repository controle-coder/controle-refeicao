import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarPedido } from '@/lib/versioning'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
})

const schema = z.object({
  requisitanteId: z.number().int().positive(),
  restauranteId: z.number().int().positive(),
  fazendaId: z.number().int().positive(),
  turmaId: z.number().int().positive(),
  dataRefeicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  itens: z.array(itemSchema).min(1),
  observacao: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const where: Record<string, unknown> = {}

    const restauranteId = searchParams.get('restauranteId')
    const fazendaId = searchParams.get('fazendaId')
    const turmaId = searchParams.get('turmaId')
    const status = searchParams.get('status')
    const requisitanteId = searchParams.get('requisitanteId')
    if (restauranteId) where.restauranteId = Number(restauranteId)
    if (fazendaId) where.fazendaId = Number(fazendaId)
    if (turmaId) where.turmaId = Number(turmaId)
    if (status) where.status = status
    if (requisitanteId) where.requisitanteId = Number(requisitanteId)

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

    const { pedido } = await criarPedido({
      restauranteId: data.restauranteId,
      fazendaId: data.fazendaId,
      turmaId: data.turmaId,
      requisitanteId: data.requisitanteId,
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
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
