import { getSession } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'

export default async function PedidosLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow">
        <a href="/pedidos/novo" className="font-bold text-lg">
          🍽️ Pedidos de Refeição
        </a>
        <div className="flex items-center gap-3">
          {session.id && (
            <span className="text-green-200 text-sm hidden sm:inline">{session.nome}</span>
          )}
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto p-4">{children}</main>
    </div>
  )
}
