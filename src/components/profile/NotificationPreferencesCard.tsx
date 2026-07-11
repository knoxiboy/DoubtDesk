"use client";

import { useState } from "react";
import { BellRing, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type NotificationPreference = "instant" | "daily" | "weekly" | "none";

type NotificationPreferencesCardProps = {
  emailNotificationsEnabled: boolean;
  notificationPreference: NotificationPreference;
};

const preferenceLabels: Record<NotificationPreference, string> = {
  instant: "Instant",
  daily: "Daily digest",
  weekly: "Weekly digest",
  none: "Off",
};

export function NotificationPreferencesCard({
  emailNotificationsEnabled: initialEmailEnabled,
  notificationPreference: initialPreference,
}: NotificationPreferencesCardProps) {
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(initialEmailEnabled);
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference>(initialPreference);
  const [isSaving, setIsSaving] = useState(false);

  const savePreferences = async (nextEmailEnabled: boolean, nextPreference: NotificationPreference) => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailNotificationsEnabled: nextEmailEnabled,
          notificationPreference: nextPreference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      toast.success("Notification preferences saved");
    } catch (error) {
      setEmailNotificationsEnabled(initialEmailEnabled);
      setNotificationPreference(initialPreference);
      toast.error(error instanceof Error ? error.message : "Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    const nextPreference: NotificationPreference =
      checked ? (notificationPreference === "none" ? "instant" : notificationPreference) : "none";

    setEmailNotificationsEnabled(checked);
    setNotificationPreference(nextPreference);
    void savePreferences(checked, nextPreference);
  };

  const handlePreferenceChange = (value: string) => {
    const nextPreference = value as NotificationPreference;
    const nextEmailEnabled = nextPreference !== "none";

    setNotificationPreference(nextPreference);
    setEmailNotificationsEnabled(nextEmailEnabled);
    void savePreferences(nextEmailEnabled, nextPreference);
  };

  return (
    <Card className="mb-8 bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BellRing className="h-5 w-5 text-blue-500" aria-hidden="true" />
          Notification preferences
        </CardTitle>
        <CardDescription>
          Choose when DoubtDesk should send email updates for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Mail className="h-4 w-4 text-blue-500" aria-hidden="true" />
              Email notifications
            </div>
            <p className="text-xs leading-5 text-slate-500 dark:text-zinc-400">
              Turn email delivery on or off for replies and classroom activity.
            </p>
          </div>
          <Switch
            checked={emailNotificationsEnabled}
            onCheckedChange={handleToggle}
            aria-label="Toggle email notifications"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-400">
            Digest frequency
          </label>
          <Select value={notificationPreference} onValueChange={handlePreferenceChange} disabled={isSaving}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950/40">
              <SelectValue placeholder="Select a frequency" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(preferenceLabels) as NotificationPreference[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {preferenceLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-white/10 dark:text-zinc-400">
          <span className="uppercase tracking-[0.24em] font-bold">Current state</span>
          <span className="inline-flex items-center gap-2">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" aria-hidden="true" /> : null}
            {emailNotificationsEnabled ? preferenceLabels[notificationPreference] : "Off"}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => savePreferences(emailNotificationsEnabled, notificationPreference)}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}
