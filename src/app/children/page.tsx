"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { Child } from "@/types/child";

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
    <div style={{ padding: "40px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>子供一覧</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={() => router.push("/children/new")}>
            ＋子供追加
          </button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>

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
                borderRadius: "8px",
                padding: "12px 16px",
              }}
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
    </div>
  );
}
