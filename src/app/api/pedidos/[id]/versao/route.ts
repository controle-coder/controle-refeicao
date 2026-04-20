import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarNovaVersao } from '@/lib/versioning'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
})

const schema = z.object({
  usuarioId: z.number().int().positive(),
  itens: z.array(itemSchema).min(1),
  observacao: z.string().optional(),
})

export async function POST(request: NextRequest, ctx: RouteContext<'/api/pedidos/[id]/versao'>) {
  try {
    const { id } = await ctx.params
    const body = await request.json()
    const data = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: { versoes: { orderBy: { numero: 'desc' }, take: 1, include: { itens: true } } },
    })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

    const tipos = pedido.versoes[0]?.itens.map((i) => i.tipoRefeicao) ?? []
    const agora = new Date()
    const ref = new Date(pedido.dataRefeicao)
    const ano = ref.getUTCFullYear()
    const mes = ref.getUTCMonth()
    const dia = ref.getUTCDate()

    // Deadlines em UTC usando offset BRT (UTC-4):
    // 19:30 UTC-4 = 23:30 UTC | 08:00 UTC-4 = 12:00 UTC | 16:00 UTC-4 = 20:00 UTC
    if (tipos.includes('CAFE_MANHA') && agora >= new Date(Date.UTC(ano, mes, dia - 1, 23, 30))) {
      return Response.json({ error: 'Prazo de edição do Café da Manhã encerrado às 19:30 do dia anterior' }, { status: 400 })
    }
    if (tipos.includes('ALMOCO') && agora >= new Date(Date.UTC(ano, mes, dia, 12, 0))) {
      return Response.json({ error: 'Prazo de edição do Almoço encerrado às 8:00 do dia da retirada' }, { status: 400 })
    }
    if (tipos.includes('JANTAR') && agora >= new Date(Date.UTC(ano, mes, dia, 20, 0))) {
      return Response.json({ error: 'Prazo de edição do Jantar encerrado às 16:00 do dia da retirada' }, { status: 400 })
    }

    await criarNovaVersao({
      pedidoId: Number(id),
      usuarioId: data.usuarioId,
      itens: data.itens,
      observacao: data.observacao,
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: Number(id) },
      include: {
        restaurante: true,
        fazenda: true,
        turma: true,
        requisitante: { select: { id: true, nome: true } },
        versoes: {
          orderBy: { numero: 'desc' },
          include: {
            itens: true,
            criadoPor: { select: { id: true, nome: true } },
          },
        },
      },
    })

    return Response.json(pedidoAtualizado)
  } catch (e: any) {
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    if (e.message?.includes('cancelado')) return Response.json({ error: e.message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
