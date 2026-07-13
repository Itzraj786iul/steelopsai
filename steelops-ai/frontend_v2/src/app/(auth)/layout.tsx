import { BrandPanel } from "@/features/auth/components/brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <BrandPanel />
      <div className="flex w-full min-w-0 items-center justify-center overflow-x-hidden p-4 sm:p-6 lg:w-1/2">{children}</div>
    </div>
  );
}
