'use client'

export default function EscolhaClient({ nome }: { nome: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-xl font-bold text-gray-800">Olá, {nome.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm mt-1">O que deseja fazer?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => { window.location.href = '/admin' }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-left px-5 flex items-center gap-3"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="font-semibold">Painel Admin</p>
              <p className="text-green-200 text-xs font-normal">Gerenciar pedidos, relatórios e cadastros</p>
            </div>
          </button>

          <button
            onClick={() => { window.location.href = '/pedidos' }}
            className="w-full bg-white border-2 border-green-600 hover:bg-green-50 text-green-700 font-semibold py-3.5 rounded-xl transition-colors text-left px-5 flex items-center gap-3"
          >
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-semibold">Fazer Pedido</p>
              <p className="text-green-500 text-xs font-normal">Solicitar refeição normalmente</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
