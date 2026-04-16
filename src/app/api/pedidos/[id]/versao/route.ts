import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { criarNovaVersao } from '@/lib/versioning'
import { z } from 'zod'
import { TipoRefeicao } from '@/generated/prisma/enums'

const itemSchema = z.object({
  tipoRefeicao: z.nativeEnum(TipoRefeicao),
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

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

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
