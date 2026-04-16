'use client'

export function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' })
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-green-200 hover:text-white text-xs underline cursor-pointer"
    >
      Sair
    </button>
  )
}
