import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { criarPedido } from '@/lib/versioning'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get('data') // YYYY-MM-DD

    // Data alvo: parâmetro ou hoje
    const dataAlvo = dataParam ?? new Date().toISOString().split('T')[0]
    const inicioDia = new Date(dataAlvo + 'T00:00:00.000Z')
    const fimDia    = new Date(dataAlvo + 'T23:59:59.999Z')

    const pedidos = await prisma.pedido.findMany({
      where: {
        restauranteId: session.restauranteId,
        dataRefeicao: { gte: inicioDia, lte: fimDia },
        status: { not: 'CANCELADO' },
      },
      include: {
        fazenda: { select: { nome: true } },
        turma: { select: { nome: true } },
        requisitante: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
      orderBy: { criadoEm: 'asc' },
    })

    return Response.json(pedidos)
  } catch {
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}

const itemAvulsoSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
})

const schemaAvulso = z.object({
  nomeVisitante: z.string().min(1, 'Informe o nome'),
  sobrenomeVisitante: z.string().min(1, 'Informe o sobrenome'),
  dataRefeicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  fazendaId: z.number().int().positive().optional(),
  turmaId: z.number().int().positive().optional(),
  itens: z.array(itemAvulsoSchema).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const data = schemaAvulso.parse(body)

    const itensFiltrados = data.itens.filter((i) => i.quantidade > 0)
    if (itensFiltrados.length === 0) {
      return Response.json({ error: 'Informe pelo menos uma refeição' }, { status: 400 })
    }

    const { pedido } = await criarPedido({
      restauranteId: session.restauranteId!,
      nomeVisitante: data.nomeVisitante,
      sobrenomeVisitante: data.sobrenomeVisitante,
      fazendaId: data.fazendaId,
      turmaId: data.turmaId,
      dataRefeicao: new Date(data.dataRefeicao + 'T12:00:00.000Z'),
      itens: itensFiltrados,
    })

    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: pedido.id },
      include: {
        fazenda: { select: { nome: true } },
        turma: { select: { nome: true } },
        requisitante: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          take: 1,
          include: { itens: true },
        },
      },
    })

    return Response.json(pedidoCompleto, { status: 201 })
  } catch (e: any) {
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    if (e.message === 'PEDIDO_DUPLICADO') {
      return Response.json({ error: 'Pedido duplicado — já existe um pedido idêntico criado há menos de 2 minutos' }, { status: 409 })
    }
    return Response.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
