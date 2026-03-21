import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useUser, useCreateUser, useUpdateUser, useResetPassword } from "@/api/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import NativeSelect from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function UserForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const userId = Number(id);
  const navigate = useNavigate();

  const { data: existingUser, isLoading: loadingUser } = useUser(userId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(userId);
  const resetPassword = useResetPassword(userId);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("user");
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  useEffect(() => {
    if (existingUser) {
      setUsername(existingUser.username);
      setEmail(existingUser.email || "");
      setFullName(existingUser.full_name || "");
      setRole(existingUser.role);
      setIsActive(existingUser.is_active);
    }
  }, [existingUser]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await updateUser.mutateAsync({
          email: email || undefined,
          full_name: fullName || undefined,
          role,
          is_active: isActive,
        });
        toast.success("User updated successfully");
      } else {
        if (!password) {
          toast.error("Password is required");
          return;
        }
        await createUser.mutateAsync({
          username,
          password,
          email: email || undefined,
          full_name: fullName || undefined,
          role,
        });
        toast.success("User created successfully");
      }
      navigate("/admin/users");
    } catch {
      // Error handled by API client
    }
  }

  async function handleResetPassword() {
    try {
      const result = await resetPassword.mutateAsync();
      setTempPassword(result.temporary_password);
      toast.success("Password reset successfully");
    } catch {
      // Error handled by API client
    }
  }

  if (isEdit && loadingUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const saving = createUser.isPending || updateUser.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit User" : "Create User"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isEdit}
              placeholder="Enter username"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
            <NativeSelect
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={[
                { value: "admin", label: "Admin" },
                { value: "user", label: "User" },
                { value: "viewer", label: "Viewer" },
              ]}
            />

            {isEdit && (
              <div className="flex items-center gap-3">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="is-active"
                />
                <Label htmlFor="is-active">Active</Label>
              </div>
            )}

            {!isEdit && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter password"
                autoComplete="new-password"
              />
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={saving}>
                {isEdit ? "Save Changes" : "Create User"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/admin/users")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Reset Password section (edit mode only) */}
      {isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a temporary password for this user. They should change it after logging in.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
              loading={resetPassword.isPending}
            >
              Generate Temporary Password
            </Button>
            {tempPassword && (
              <div className="mt-4 rounded-lg bg-accent/50 border border-border px-4 py-3">
                <p className="text-sm text-muted-foreground mb-1">Temporary password:</p>
                <code className="text-sm font-mono font-semibold text-foreground select-all">
                  {tempPassword}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Copy this password now. It will not be shown again.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
