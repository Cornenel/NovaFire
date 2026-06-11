import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata = {
  title: "Set Password | Nova Fire",
  robots: { index: false },
};

export default function SetPasswordPage() {
  return (
    <div className="min-h-screen nf-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-2xl font-bold text-white font-[family-name:var(--font-syne)]">
            Nova<span className="text-red-600">Fire</span>
          </p>
          <h1 className="text-lg font-semibold text-white mt-4">
            Set your password
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Choose a password to finish setting up your account.
          </p>
        </div>
        <SetPasswordForm />
      </div>
    </div>
  );
}
