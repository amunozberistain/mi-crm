import { logout } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export default function Header({ userEmail }: { userEmail: string }) {
  return (
    <header className="h-14 flex-shrink-0 bg-[#F5F0E8] border-b border-[#D4C5B0] flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#5C3D2E]/12 flex items-center justify-center shrink-0">
          <span className="text-[#5C3D2E] text-xs font-semibold">
            {userEmail.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm text-[#8B6F5E]">{userEmail}</span>
      </div>

      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-[#8B6F5E] hover:text-[#2C1810] hover:bg-[#D4C5B0]/40 text-xs"
        >
          Cerrar sesión
        </Button>
      </form>
    </header>
  )
}
