import { prisma } from '@/lib/prisma'
import { GerenciarContratos } from './GerenciarContratos'

export default async function ContratosPage() {
  const contratos = await prisma.contrato.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { requisitantes: true } } },
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Contratos</h1>
      <GerenciarContratos initial={contratos as any} />
    </div>
  )
}
