import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import EscolhaClient from './EscolhaClient'

export default async function EscolhaPage() {
  const session = await getSession()
  if (!session.id) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/pedidos')

  return <EscolhaClient nome={session.nome} />
}
