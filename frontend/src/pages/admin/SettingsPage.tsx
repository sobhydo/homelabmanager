import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSettings, useUpdateSetting } from "@/api/settings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { SystemSetting } from "@/types/user";

interface SettingRowProps {
  setting: SystemSetting;
  onSave: (key: string, value: string | null) => void;
  saving: boolean;
}

function SettingRow({ setting, onSave, saving }: SettingRowProps) {
  const [value, setValue] = useState(setting.value ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setValue(setting.value ?? "");
    setDirty(false);
  }, [setting.value]);

  function handleChange(newVal: string) {
    setValue(newVal);
    setDirty(newVal !== (setting.value ?? ""));
  }

  const isBool = setting.value_type === "boolean";
  const isPassword = setting.key.toLowerCase().includes("key") || setting.key.toLowerCase().includes("secret") || setting.key.toLowerCase().includes("password");

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium text-foreground">
            {setting.description || setting.key}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          {setting.key}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isBool ? (
          <Switch
            checked={value === "true"}
            onCheckedChange={(checked) => {
              const newVal = checked ? "true" : "false";
              setValue(newVal);
              onSave(setting.key, newVal);
            }}
          />
        ) : (
          <>
            <Input
              type={isPassword ? "password" : "text"}
              value={value}
              onChange={(e) => handleChange(e.target.value)}
              className="w-64"
            />
            {dirty && (
              <Button
                size="sm"
                onClick={() => {
                  onSave(setting.key, value || null);
                  setDirty(false);
                }}
                loading={saving}
              >
                Save
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSetting = useUpdateSetting();

  function handleSave(key: string, value: string | null) {
    updateSetting.mutate(
      { key, value },
      {
        onSuccess: () => toast.success("Setting updated"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Settings already grouped by category from backend
  const categories = new Map<string, SystemSetting[]>();
  if (settings && typeof settings === "object") {
    for (const [cat, items] of Object.entries(settings)) {
      if (Array.isArray(items) && items.length > 0) {
        categories.set(cat, items);
      }
    }
  }

  const categoryLabels: Record<string, string> = {
    general: "General",
    appearance: "Appearance",
    integrations: "Integrations",
    notifications: "Notifications",
  };

  const tabKeys = Array.from(categories.keys()).sort((a, b) => {
    const order = ["general", "appearance", "integrations", "notifications"];
    return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) -
      (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          System Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure application settings and integrations
        </p>
      </div>

      <Tabs defaultValue={tabKeys[0] || "general"}>
        <TabsList>
          {tabKeys.map((key) => (
            <TabsTrigger key={key} value={key}>
              {categoryLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabKeys.map((key) => (
          <TabsContent key={key} value={key}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {categoryLabels[key] || key.charAt(0).toUpperCase() + key.slice(1)}
                </CardTitle>
                <CardDescription>
                  Manage {(categoryLabels[key] || key).toLowerCase()} settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {categories.get(key)!.map((setting) => (
                    <SettingRow
                      key={setting.key}
                      setting={setting}
                      onSave={handleSave}
                      saving={updateSetting.isPending}
                    />
                  ))}
                </div>
                {categories.get(key)!.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4">
                    No settings in this category.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {tabKeys.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No settings configured yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
