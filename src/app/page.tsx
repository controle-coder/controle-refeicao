import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()
  if (!session.id) redirect('/identificar')
  if (session.role === 'ADMIN') redirect('/admin')
  redirect('/pedidos')
}
