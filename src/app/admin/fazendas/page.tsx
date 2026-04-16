import { prisma } from '@/lib/prisma'
import { GerenciarFazendas } from './GerenciarFazendas'

export default async function FazendasPage() {
  const fazendas = await prisma.fazenda.findMany({ orderBy: { nome: 'asc' } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Fazendas</h1>
      <GerenciarFazendas initial={fazendas} />
    </div>
  )
}
