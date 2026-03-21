import { useState, useEffect, type FormEvent } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, changePassword } from "@/api/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const { user, setUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  async function handleProfileSave(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateProfile({
        full_name: fullName || undefined,
        email: email || undefined,
      });
      setUser(updated);
      toast.success("Profile updated successfully");
    } catch {
      // Handled by API client
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      // Handled by API client
    } finally {
      setSavingPassword(false);
    }
  }

  if (!user) return null;

  const roleBadgeColor =
    user.role === "admin" ? "purple" : user.role === "user" ? "blue" : "gray";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {user.full_name || user.username}
              </h3>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge color={roleBadgeColor}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Member since{" "}
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <Input
              label="Username"
              value={user.username}
              disabled
              helperText="Username cannot be changed"
            />
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" loading={savingProfile}>
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Enter current password"
              autoComplete="current-password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            <Button type="submit" loading={savingPassword}>
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
