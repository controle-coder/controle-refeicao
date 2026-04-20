import { prisma } from '@/lib/prisma'
import { GerenciarUsuariosRestaurante } from './GerenciarUsuariosRestaurante'

export default async function UsuariosRestaurantePage() {
  const [usuarios, restaurantes] = await Promise.all([
    prisma.requisitante.findMany({
      where: { role: 'RESTAURANTE' },
      include: { restaurante: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    }),
    prisma.restaurante.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true },
    }),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Usuários dos Restaurantes</h1>
      <GerenciarUsuariosRestaurante initial={usuarios as any} restaurantes={restaurantes} />
    </div>
  )
}
