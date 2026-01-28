"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Field, TextInput } from "@/components/Field";
import { PrimaryButton } from "@/components/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      router.push("/children");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("メールアドレスまたはパスワードが違います");
      } else {
        setError("ログインに失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <TopBar title="ログイン" />
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: "420px",
          display: "grid",
          gap: "16px",
          padding: "16px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
        }}
      >
        <Field label="メールアドレス">
          <TextInput
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="パスワード">
          <TextInput
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        {error ? <p style={{ color: "#dc2626", margin: 0 }}>{error}</p> : null}
        <PrimaryButton type="submit" loading={loading} loadingText="ログイン中...">
          ログイン
        </PrimaryButton>
      </form>
    </AppShell>
  );
}
