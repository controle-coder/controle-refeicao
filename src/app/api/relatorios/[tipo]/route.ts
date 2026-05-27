import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, authError, getGestorScope } from '@/lib/auth'

const INCLUDE_PEDIDO = {
  restaurante: true,
  fazenda: true,
  turma: true,
  requisitante: {
    select: {
      id: true,
      nome: true,
      contratos: {
        select: {
          id: true,
          nome: true,
          numero: true,
          precosContrato: true,
        },
      },
    },
  },
  versoes: {
    orderBy: { numero: 'desc' } as const,
    take: 1,
    include: { itens: true },
  },
}

export async function GET(request: NextRequest, ctx: RouteContext<'/api/relatorios/[tipo]'>) {
  try {
    const session = await requireAuth()
    if (session.role !== 'ADMIN' && session.role !== 'GESTOR') return authError('FORBIDDEN')
    const { tipo } = await ctx.params

    if (!['restaurante', 'fazenda', 'turma'].includes(tipo)) {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    const deStr = searchParams.get('de')
    const ateStr = searchParams.get('ate')
    const de  = deStr  ? new Date(deStr  + 'T00:00:00.000Z') : undefined
    const ate = ateStr ? new Date(ateStr + 'T23:59:59.999Z') : undefined

    const dateFilter = de || ate
      ? { dataRefeicao: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } }
      : {}

    const contratoId     = searchParams.get('contratoId')
    const fazendaId      = searchParams.get('fazendaId')
    const turmaId        = searchParams.get('turmaId')
    const restauranteId  = searchParams.get('restauranteId')
    const requisitanteId = searchParams.get('requisitanteId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { ...dateFilter, status: { not: 'CANCELADO' } }
    if (fazendaId)      where.fazendaId     = Number(fazendaId)
    if (turmaId)        where.turmaId       = Number(turmaId)
    if (restauranteId)  where.restauranteId = Number(restauranteId)
    if (requisitanteId) where.requisitanteId = Number(requisitanteId)
    if (contratoId)     where.requisitante  = {
      ...(where.requisitante ?? {}),
      contratos: { some: { id: Number(contratoId) } },
    }

    // Gestor: restringe aos pedidos vinculados ao(s) contrato(s) dele
    if (session.role === 'GESTOR') {
      const scope = await getGestorScope(session.contratoIds ?? [])
      where.OR = [
        { restauranteId: { in: scope.restauranteIds } },
        { fazendaId: { in: scope.fazendaIds } },
        { turmaId: { in: scope.turmaIds } },
        { requisitanteId: { in: scope.requisitanteIds } },
      ]
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: INCLUDE_PEDIDO,
      orderBy: { dataRefeicao: 'desc' },
    })

    return Response.json(pedidos)
  } catch (e: any) {
    return authError(e.message)
  }
}
