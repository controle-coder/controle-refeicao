import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin, authError } from '@/lib/auth'

const INCLUDE_PEDIDO = {
  restaurante: true,
  fazenda: true,
  turma: true,
  requisitante: { select: { id: true, nome: true } },
  versoes: {
    orderBy: { numero: 'desc' } as const,
    take: 1,
    include: { itens: true },
  },
}

export async function GET(request: NextRequest, ctx: RouteContext<'/api/relatorios/[tipo]'>) {
  try {
    await requireAdmin()
    const { tipo } = await ctx.params
    const { searchParams } = new URL(request.url)

    const deStr = searchParams.get('de')
    const ateStr = searchParams.get('ate')
    const de  = deStr  ? new Date(deStr  + 'T00:00:00.000Z') : undefined
    const ate = ateStr ? new Date(ateStr + 'T23:59:59.999Z') : undefined

    const dateFilter = de || ate
      ? { dataRefeicao: { ...(de ? { gte: de } : {}), ...(ate ? { lte: ate } : {}) } }
      : {}

    const idParam = searchParams.get(`${tipo}Id`)
    const idFilter = idParam ? { [`${tipo}Id`]: Number(idParam) } : {}

    if (!['restaurante', 'fazenda', 'turma'].includes(tipo)) {
      return Response.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    const pedidos = await prisma.pedido.findMany({
      where: { ...idFilter, ...dateFilter },
      include: INCLUDE_PEDIDO,
      orderBy: { dataRefeicao: 'desc' },
    })

    return Response.json(pedidos)
  } catch (e: any) {
    return authError(e.message)
  }
}
