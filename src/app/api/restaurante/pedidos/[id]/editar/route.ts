import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
})

const schema = z.object({
  itens: z.array(itemSchema).min(1),
  observacao: z.string().min(5, 'Informe a observação (mín. 5 caracteres)'),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session.id || session.role !== 'RESTAURANTE' || !session.restauranteId) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        versoes: { orderBy: { numero: 'desc' }, take: 1, include: { itens: true } },
      },
    })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })
    if (pedido.restauranteId !== session.restauranteId) {
      return Response.json({ error: 'Pedido não pertence a este restaurante' }, { status: 403 })
    }
    if (pedido.status === 'CANCELADO') {
      return Response.json({ error: 'Pedido cancelado não pode ser editado' }, { status: 400 })
    }

    const itensFiltrados = data.itens.filter((i) => i.quantidade > 0)
    if (itensFiltrados.length === 0) {
      return Response.json({ error: 'A edição precisa ter pelo menos uma refeição com quantidade > 0' }, { status: 400 })
    }

    const novoNumero = pedido.versaoAtual + 1
    const obsComAutor = `[Restaurante: ${session.nome}] ${data.observacao}`

    await prisma.$transaction([
      prisma.versaoPedido.create({
        data: {
          pedidoId: pedido.id,
          numero: novoNumero,
          observacao: obsComAutor,
          itens: {
            create: itensFiltrados.map((i) => ({
              tipoRefeicao: i.tipoRefeicao,
              quantidade: i.quantidade,
            })),
          },
        },
      }),
      prisma.pedido.update({
        where: { id: pedido.id },
        data: { versaoAtual: novoNumero, status: 'ABERTO' },
      }),
    ])

    const atualizado = await prisma.pedido.findUnique({
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

    return Response.json(atualizado)
  } catch (e: any) {
    if (e?.name === 'ZodError') return Response.json({ error: e.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    return Response.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
