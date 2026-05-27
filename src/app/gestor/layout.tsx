import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'
import { GestorNav } from '@/components/GestorNav'

export default async function GestorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.id) redirect('/login')
  if (session.role !== 'GESTOR' && session.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-950 border-b border-gray-800 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-base tracking-tight">📊 Gestor</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400 text-xs hidden sm:block">{session.nome}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <GestorNav />
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  )
}
