import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, authError } from '@/lib/auth'
import { z } from 'zod'
import { Status } from '@/generated/prisma/enums'

const schema = z.object({
  status: z.nativeEnum(Status),
})

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/pedidos/[id]/status'>) {
  try {
    const session = await requireAuth()

    const { id } = await ctx.params
    const body = await request.json()
    const { status } = schema.parse(body)

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(id) } })
    if (!pedido) return Response.json({ error: 'Não encontrado' }, { status: 404 })

    // GESTOR não pode alterar status
    if (session.role === 'GESTOR') return authError('FORBIDDEN')

    // REQUISITANTE só pode marcar como ENVIADO o próprio pedido
    if (session.role === 'REQUISITANTE') {
      if (status !== Status.ENVIADO) return authError('FORBIDDEN')
      if (pedido.requisitanteId !== session.id) return authError('FORBIDDEN')
    }

    // RESTAURANTE só pode alterar pedidos do seu restaurante
    if (session.role === 'RESTAURANTE' && pedido.restauranteId !== session.restauranteId) {
      return authError('FORBIDDEN')
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(id) },
      data: { status },
    })

    return Response.json(atualizado)
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN') return authError(e.message)
    if (e instanceof z.ZodError) return Response.json({ error: e.issues }, { status: 400 })
    return Response.json({ error: 'Erro interno' }, { status: 500 })
  }
}
