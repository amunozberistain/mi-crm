import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export default function Header({ userEmail }: { userEmail: string }) {
  return (
    <header className="h-14 flex-shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Nombre del usuario */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-700 text-xs font-semibold">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-gray-600">{userEmail}</span>
      </div>

      {/* Botón de cerrar sesión — llama al Server Action logout() */}
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-900"
        >
          Cerrar sesión
        </Button>
      </form>
    </header>
  )
}
