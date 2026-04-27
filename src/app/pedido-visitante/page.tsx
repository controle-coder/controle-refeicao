import { prisma } from '@/lib/prisma'
import { FormularioVisitante } from './FormularioVisitante'

export default async function PedidoVisitantePage() {
  const restaurantes = await prisma.restaurante.findMany({
    where: { ativo: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true },
  })

  return <FormularioVisitante restaurantes={restaurantes} />
}
