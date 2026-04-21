import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
})

const schema = z.object({
  itens: z.array(itemSchema).min(1),
  motivo: z.string().min(5, 'Informe o motivo (mín. 5 caracteres)'),
})

export async function POST(req: NextRequest, ctx: RouteContext<'/api/admin/pedidos/[id]/editar'>) {
  try {
    const session = await requireAdmin()
    const { id } = await ctx.params
    const body = await req.json()
    const data = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        versoes: { orderBy: { numero: 'desc' }, take: 1, include: { itens: true } },
      },
    })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })
    if (pedido.status === 'CANCELADO') {
      return Response.json({ error: 'Pedido cancelado não pode ser editado' }, { status: 400 })
    }

    const itensFiltrados = data.itens.filter((i) => i.quantidade > 0)
    if (itensFiltrados.length === 0) {
      return Response.json({ error: 'A edição precisa ter pelo menos uma refeição com quantidade > 0' }, { status: 400 })
    }

    const novoNumero = pedido.versaoAtual + 1

    await prisma.$transaction([
      prisma.versaoPedido.create({
        data: {
          pedidoId: pedido.id,
          numero: novoNumero,
          observacao: data.motivo,
          criadoPorId: session.id,
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
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { id: true, nome: true } },
        canceladoPor: { select: { nome: true } },
        versoes: {
          orderBy: { numero: 'asc' },
          include: {
            itens: true,
            criadoPor: { select: { id: true, nome: true } },
          },
        },
      },
    })

    return Response.json(atualizado)
  } catch (e: any) {
    if (e?.name === 'ZodError') return Response.json({ error: e.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    return Response.json({ error: e.message || 'Erro interno' }, { status: 500 })
  }
}
