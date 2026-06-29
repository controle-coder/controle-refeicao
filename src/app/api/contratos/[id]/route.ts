import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'
import { z } from 'zod'

const precoSchema = z.object({
  restauranteId: z.number().int().positive(),
  precoCafeManha: z.number().nonnegative().nullable().optional(),
  precoAlmoco: z.number().nonnegative().nullable().optional(),
  precoJantar: z.number().nonnegative().nullable().optional(),
  precoAlmocoSelf: z.number().nonnegative().nullable().optional(),
  precoJantarSelf: z.number().nonnegative().nullable().optional(),
  linkGrupoWhatsApp: z.string().nullable().optional(),
})

const schema = z.object({
  nome: z.string().min(1).optional(),
  numero: z.string().optional(),
  descricao: z.string().optional(),
  anotacoes: z.string().optional(),
  ativo: z.boolean().optional(),
  fazendaIds: z.array(z.number().int().positive()).optional(),
  restauranteIds: z.array(z.number().int().positive()).optional(),
  turmaIds: z.array(z.number().int().positive()).optional(),
  precos: z.array(precoSchema).optional(),
})

const INCLUDE = {
  _count: { select: { requisitantes: true } },
  fazendas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
  restaurantes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
  turmas: { select: { id: true, nome: true, fazendaId: true }, orderBy: { nome: 'asc' } },
  precosContrato: true,
} as const

export async function PUT(request: NextRequest, ctx: RouteContext<'/api/contratos/[id]'>) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    const { fazendaIds, restauranteIds, turmaIds, precos, ...rest } = schema.parse(body)
    const contratoId = Number(id)

    // Se precos foi enviado, deleta os antigos e recria
    if (precos !== undefined) {
      await prisma.precoContrato.deleteMany({ where: { contratoId } })
      if (precos.length > 0) {
        await prisma.precoContrato.createMany({
          data: precos.map((p) => ({
            contratoId,
            restauranteId: p.restauranteId,
            precoCafeManha: p.precoCafeManha ?? null,
            precoAlmoco: p.precoAlmoco ?? null,
            precoJantar: p.precoJantar ?? null,
            precoAlmocoSelf: p.precoAlmocoSelf ?? null,
            precoJantarSelf: p.precoJantarSelf ?? null,
            linkGrupoWhatsApp: p.linkGrupoWhatsApp ?? null,
          })),
        })
      }
    }

    const item = await prisma.contrato.update({
      where: { id: contratoId },
      data: {
        ...rest,
        ...(fazendaIds !== undefined && { fazendas: { set: fazendaIds.map((id) => ({ id })) } }),
        ...(restauranteIds !== undefined && { restaurantes: { set: restauranteIds.map((id) => ({ id })) } }),
        ...(turmaIds !== undefined && { turmas: { set: turmaIds.map((id) => ({ id })) } }),
      },
      include: INCLUDE,
    })
    return Response.json(item)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues[0].message }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
