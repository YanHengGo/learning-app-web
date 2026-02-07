"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { SecondaryButton } from "@/components/Button";

type Status = "loading" | "success" | "error";

export default function LoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const isTokenValid = useMemo(() => token.trim().length >= 10, [token]);

  useEffect(() => {
    if (isTokenValid) {
      setToken(token);
      setStatus("success");
      router.replace("/children");
      return;
    }

    setStatus("error");
    setError("token not found");
    const timer = window.setTimeout(() => {
      router.replace("/login");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [isTokenValid, router, token]);

  return (
    <AppShell>
      <TopBar title="ログイン" backHref="/login" />
      {status === "loading" && <p>Signing you in...</p>}
      {status === "success" && <p>Signed in. Redirecting...</p>}
      {status === "error" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <p>Login failed: {error}</p>
          <SecondaryButton onClick={() => router.replace("/login")}>
            Back to login
          </SecondaryButton>
        </div>
      )}
    </AppShell>
  );
}
