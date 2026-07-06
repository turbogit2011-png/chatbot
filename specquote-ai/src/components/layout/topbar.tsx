import { Avatar } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/security/rbac";
import { logoutAction } from "@/lib/actions/auth";
import type { UserRole } from "@prisma/client";

export function Topbar({ name, email, role, avatarColor }: { name: string; email: string; role: UserRole; avatarColor: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p className="text-[13px] font-medium text-gray-900">{name}</p>
          <p className="text-[11px] text-gray-500">{ROLE_LABELS[role]}</p>
        </div>
        <Avatar name={name} color={avatarColor} size={32} />
        <form action={logoutAction}>
          <button
            type="submit"
            title={`Sign out ${email}`}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
