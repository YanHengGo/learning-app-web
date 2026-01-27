"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { Child } from "@/types/child";

type Status = "idle" | "loading" | "success" | "error";

type ErrorInfo = {
  message: string;
};

export default function ChildDetailPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params?.childId;
  const token = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<Status>("idle");
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [gradeInput, setGradeInput] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (typeof childId !== "string") {
      setError({ message: "子供IDが不正です" });
      setStatus("error");
      return;
    }

    const fetchChild = async () => {
      setStatus("loading");
      setError(null);

      try {
        const data = await apiFetch<Child[]>("/children", { token });
        const match = data.find((item) => item.id === childId) ?? null;
        if (!match) {
          setError({ message: "子供が見つかりません" });
          setStatus("error");
          return;
        }
        setChild(match);
        setNameInput(match.name);
        setGradeInput(match.grade ?? "");
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
    };

    void fetchChild();
  }, [childId, router, token]);

  const handleSave = async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setSaveError("名前は必須です");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        name: trimmedName,
        grade: gradeInput.trim() ? gradeInput.trim() : null,
      };
      const updated = await apiFetch<Child>(`/children/${childId}`, {
        method: "PUT",
        token,
        body: payload,
      });
      setChild(updated);
      setNameInput(updated.name);
      setGradeInput(updated.grade ?? "");
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace("/login");
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setSaveError("更新APIが未実装の可能性があります");
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "原因不明のエラーが発生しました";
      setSaveError(`保存に失敗しました: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (child) {
      setNameInput(child.name);
      setGradeInput(child.grade ?? "");
    }
    setSaveError(null);
    setIsEditing(false);
  };

  return (
    <div style={{ padding: "40px" }}>
      <button
        onClick={() => router.push("/children")}
        style={{ marginBottom: "16px" }}
      >
        ← 子供一覧に戻る
      </button>

      {status === "loading" && <p>Loading...</p>}

      {status === "error" && (
        <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
      )}

      {status === "success" && child && (
        <div style={{ display: "grid", gap: "16px" }}>
          {!isEditing ? (
            <div style={{ display: "grid", gap: "8px" }}>
              <h1 style={{ margin: 0 }}>{child.name}</h1>
              <p style={{ margin: 0, color: "#475569" }}>
                学年: {child.grade ?? "未設定"}
              </p>
              <button
                onClick={() => {
                  setSaveError(null);
                  setIsEditing(true);
                }}
                style={{ width: "fit-content" }}
              >
                編集
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
              <label style={{ display: "grid", gap: "6px" }}>
                名前
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  required
                />
              </label>
              <label style={{ display: "grid", gap: "6px" }}>
                学年
                <input
                  type="text"
                  value={gradeInput}
                  onChange={(event) => setGradeInput(event.target.value)}
                />
              </label>
              {saveError ? (
                <p style={{ color: "#dc2626", margin: 0 }}>{saveError}</p>
              ) : null}
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "保存"}
                </button>
                <button onClick={handleCancelEdit} disabled={saving}>
                  キャンセル
                </button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => router.push("/children/today")}>
              今日の学習
            </button>
            <button onClick={() => router.push("/children/tasks")}>
              タスク管理
            </button>
            <button onClick={() => router.push("/children/calendar")}>
              カレンダー
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
