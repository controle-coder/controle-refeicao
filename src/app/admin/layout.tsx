import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'

const navItems = [
  { href: '/admin', label: '📊 Dashboard', exact: true },
  { href: '/admin/restaurantes', label: '🍴 Restaurantes' },
  { href: '/admin/fazendas', label: '🏭 Fazendas' },
  { href: '/admin/turmas', label: '👥 Turmas' },
  { href: '/admin/requisitantes', label: '👤 Requisitantes' },
  { href: '/admin/pedidos', label: '📋 Pedidos' },
  { href: '/admin/relatorios', label: '📈 Relatórios' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session.id) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/pedidos')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-bold text-lg">🍽️ Admin</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-400">{session.nome}</span>
          <Link href="/pedidos" className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
            🛒 Tela de Pedidos
          </Link>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <nav className="w-48 bg-gray-800 text-gray-300 text-sm shrink-0 hidden md:block">
          <div className="p-2 space-y-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded hover:bg-gray-700 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 flex">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 text-center py-2 text-xs text-gray-400 hover:text-white"
          >
            <div className="text-lg">{item.label.split(' ')[0]}</div>
          </Link>
        ))}
      </nav>
    </div>
  )
}
