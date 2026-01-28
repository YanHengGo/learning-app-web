"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { Child } from "@/types/child";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

type Status = "idle" | "loading" | "success" | "error";

type ErrorInfo = {
  message: string;
};

export default function ChildrenPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [children, setChildren] = useState<Child[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);

  const token = useMemo(() => getToken(), []);

  const fetchChildren = useCallback(async () => {
    if (!token) {
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const data = await apiFetch<Child[]>("/children", { token });
      setChildren(data);
      setStatus("success");
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
      setError({ message });
      setStatus("error");
    }
  }, [router, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    void fetchChildren();
  }, [fetchChildren, router, token]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <AppShell>
      <TopBar
        title="子供一覧"
        actions={
          <>
            <PrimaryButton onClick={() => router.push("/children/new")}>
              ＋子供追加
            </PrimaryButton>
            <SecondaryButton onClick={handleLogout}>Logout</SecondaryButton>
          </>
        }
      />

      {status === "loading" && <p>Loading...</p>}

      {status === "error" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <p>
            読み込みに失敗しました: {error?.message ?? "不明なエラー"}
          </p>
          <button onClick={fetchChildren}>再試行</button>
        </div>
      )}

      {status === "success" && children.length === 0 && (
        <p>子供がまだ登録されていません</p>
      )}

      {status === "success" && children.length > 0 && (
        <div style={{ display: "grid", gap: "12px" }}>
          {children.map((child) => (
            <div
              key={child.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                cursor: "pointer",
                background: "#ffffff",
              }}
              onClick={() => router.push(`/children/${child.id}`)}
            >
              <h2 style={{ margin: "0 0 4px", fontSize: "16px" }}>
                {child.name}
              </h2>
              <p style={{ margin: 0, color: "#475569" }}>
                学年: {child.grade ?? "未設定"}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
