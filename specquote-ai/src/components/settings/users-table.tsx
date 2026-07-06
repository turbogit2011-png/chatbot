"use client";

import { useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/security/rbac";
import { updateUserRoleAction, toggleUserActiveAction, removeInvitationAction } from "@/lib/actions/org";
import { formatDate } from "@/lib/utils";
import type { User, Invitation, UserRole } from "@prisma/client";

const ASSIGNABLE_ROLES: UserRole[] = ["OWNER", "ADMIN", "SALES_MANAGER", "SALES_REP", "ESTIMATOR", "VIEWER"];

export function UsersTable({
  users,
  invitations,
  editable,
  currentUserId,
}: {
  users: User[];
  invitations: Invitation[];
  editable: boolean;
  currentUserId: string;
}) {
  const [, startTransition] = useTransition();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team members ({users.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-border p-0">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={u.name} color={u.avatarColor} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {u.name} {u.id === currentUserId ? <span className="text-xs text-gray-400">(you)</span> : null}
                </p>
                <p className="truncate text-xs text-gray-500">{u.email}</p>
              </div>
              {editable ? (
                <Select
                  defaultValue={u.role}
                  className="w-44"
                  disabled={u.id === currentUserId}
                  onChange={(e) => startTransition(() => updateUserRoleAction(u.id, e.target.value as UserRole))}
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge tone="neutral">{ROLE_LABELS[u.role]}</Badge>
              )}
              {editable && u.id !== currentUserId ? (
                <button
                  onClick={() => startTransition(() => toggleUserActiveAction(u.id, !u.isActive))}
                  className="text-xs font-medium text-gray-500 hover:underline"
                >
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>
              ) : null}
            </div>
          ))}
        </CardBody>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-border p-0">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900">{inv.email}</p>
                  <p className="text-xs text-gray-500">
                    {ROLE_LABELS[inv.role]} · expires {formatDate(inv.expiresAt)}
                  </p>
                </div>
                {editable && (
                  <button
                    onClick={() => startTransition(() => removeInvitationAction(inv.id))}
                    className="text-xs font-medium text-red-500 hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </>
  );
}
