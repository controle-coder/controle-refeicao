import { prisma } from '@/lib/prisma'
import { GerenciarRestaurantes } from './GerenciarRestaurantes'

export default async function RestaurantesPage() {
  const restaurantes = await prisma.restaurante.findMany({ orderBy: { nome: 'asc' } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Restaurantes</h1>
      <GerenciarRestaurantes initial={restaurantes} />
    </div>
  )
}
