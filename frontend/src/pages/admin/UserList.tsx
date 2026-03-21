import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useUsers, useDeleteUser } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DataTable, { type Column } from "@/components/ui/table";
import Pagination from "@/components/ui/Pagination";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { User } from "@/types/user";

const roleBadgeColor: Record<string, "purple" | "blue" | "gray"> = {
  admin: "purple",
  user: "blue",
  viewer: "gray",
};

export default function UserList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useUsers({ page, page_size: 20 });
  const deleteUser = useDeleteUser();
  const [confirmUser, setConfirmUser] = useState<User | null>(null);

  function handleDelete() {
    if (!confirmUser) return;
    deleteUser.mutate(confirmUser.id, {
      onSuccess: () => {
        toast.success("User deactivated successfully");
        setConfirmUser(null);
      },
    });
  }

  const columns: Column<User>[] = [
    {
      key: "username",
      header: "Username",
      render: (u) => (
        <span className="font-medium text-foreground">{u.username}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <span className="text-muted-foreground">{u.email || "--"}</span>
      ),
    },
    {
      key: "full_name",
      header: "Full Name",
      render: (u) => u.full_name || "--",
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <Badge color={roleBadgeColor[u.role] || "gray"}>
          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (u) => (
        <Badge color={u.is_active ? "green" : "red"} dot>
          {u.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "last_login",
      header: "Last Login",
      render: (u) =>
        u.last_login
          ? new Date(u.last_login).toLocaleDateString()
          : "Never",
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/users/${u.id}/edit`);
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmUser(u);
            }}
          >
            Deactivate
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            User Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>
        <Button onClick={() => navigate("/admin/users/new")}>
          <PlusIcon className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        loading={isLoading}
        rowKey={(u) => u.id}
        onRowClick={(u) => navigate(`/admin/users/${u.id}/edit`)}
        emptyMessage="No users found"
      />

      {data && data.total_pages > 1 && (
        <Pagination
          page={page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        onConfirm={handleDelete}
        title="Deactivate User"
        message={`Are you sure you want to deactivate "${confirmUser?.username}"? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleteUser.isPending}
      />
    </div>
  );
}
