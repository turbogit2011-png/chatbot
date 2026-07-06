import { SettingsTabs } from "@/components/layout/settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Settings</h1>
      <SettingsTabs />
      {children}
    </div>
  );
}
