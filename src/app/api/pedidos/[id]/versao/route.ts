import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarNovaVersao } from '@/lib/versioning'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.enum(Object.values(TipoRefeicao) as [TipoRefeicao, ...TipoRefeicao[]]),
  quantidade: z.number().int().min(0),
  observacao: z.string().optional(),
})

const schema = z.object({
  usuarioId: z.number().int().positive(),
  itens: z.array(itemSchema).min(1),
  observacao: z.string().optional(),
  dataRefeicao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional(),
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

    const agora = new Date()
    const ref = new Date(pedido.dataRefeicao)
    const ano = ref.getUTCFullYear()
    const mes = ref.getUTCMonth()
    const dia = ref.getUTCDate()

    // Deadlines em UTC (AMT UTC-4: 05:00 = 09:00 UTC | 12:00 = 16:00 UTC | 19:00 = 23:00 UTC)
    const deadlines: Record<string, Date> = {
      CAFE_MANHA: new Date(Date.UTC(ano, mes, dia, 9, 0)),
      ALMOCO:     new Date(Date.UTC(ano, mes, dia, 16, 0)),
      JANTAR:     new Date(Date.UTC(ano, mes, dia, 23, 0)),
    }

    const itensExistentes = pedido.versoes[0]?.itens ?? []
    const algumEditavel = data.itens.some((item) => agora < (deadlines[item.tipoRefeicao] ?? new Date(0)))
    if (!algumEditavel) {
      return Response.json({ error: 'Prazo de edição encerrado para todas as refeições deste pedido' }, { status: 400 })
    }

    // Para tipos com prazo encerrado, preserva quantidade e observação existentes
    const itensMesclados = data.itens.map((item) => {
      if (agora >= (deadlines[item.tipoRefeicao] ?? new Date(0))) {
        const existente = itensExistentes.find((i) => i.tipoRefeicao === item.tipoRefeicao)
        if (existente) {
          return { tipoRefeicao: item.tipoRefeicao, quantidade: existente.quantidade, observacao: existente.observacao ?? undefined }
        }
      }
      return item
    })

    await criarNovaVersao({
      pedidoId: Number(id),
      usuarioId: data.usuarioId,
      itens: itensMesclados,
      observacao: data.observacao,
    })

    if (data.dataRefeicao) {
      const tresHoras = new Date(pedido.criadoEm.getTime() + 3 * 60 * 60 * 1000)
      if (agora <= tresHoras) {
        await prisma.pedido.update({
          where: { id: Number(id) },
          data: { dataRefeicao: new Date(data.dataRefeicao + 'T12:00:00.000Z') },
        })
      }
    }

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
