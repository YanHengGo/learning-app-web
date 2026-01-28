"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { Child } from "@/types/child";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Field, TextInput } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

export default function ChildCreatePage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
    }
  }, [router, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("名前は必須です");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiFetch<Child>("/children", {
        method: "POST",
        token: token ?? undefined,
        body: {
          name: trimmedName,
          grade: grade.trim() ? grade.trim() : undefined,
        },
      });
      router.replace("/children");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }

      const message =
        err instanceof Error
          ? err.message
          : "原因不明のエラーが発生しました";
      setError(`登録に失敗しました: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/children");
  };

  return (
    <AppShell>
      <TopBar title="子供追加" backHref="/children" />
      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: "16px", maxWidth: "420px" }}
      >
        <Field label="名前">
          <TextInput
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="学年">
          <TextInput
            type="text"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          />
        </Field>
        {error ? <p style={{ color: "#dc2626", margin: 0 }}>{error}</p> : null}
        <div style={{ display: "flex", gap: "12px" }}>
          <PrimaryButton type="submit" loading={loading} loadingText="Saving...">
            登録
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={handleCancel}
            disabled={loading}
          >
            キャンセル
          </SecondaryButton>
        </div>
      </form>
    </AppShell>
  );
}
