"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { Child } from "@/types/child";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { Field, TextInput } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

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
    <AppShell>
      <TopBar title="子供詳細" backHref="/children" />

      {status === "loading" && <p>Loading...</p>}

      {status === "error" && (
        <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
      )}

      {status === "success" && child && (
        <div style={{ display: "grid", gap: "16px" }}>
          {!isEditing ? (
            <div style={{ display: "grid", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "22px" }}>{child.name}</h2>
              <p style={{ margin: 0, color: "#475569" }}>
                学年: {child.grade ?? "未設定"}
              </p>
              <SecondaryButton
                onClick={() => {
                  setSaveError(null);
                  setIsEditing(true);
                }}
                style={{ width: "fit-content" }}
              >
                編集
              </SecondaryButton>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
              <Field label="名前">
                <TextInput
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  required
                />
              </Field>
              <Field label="学年">
                <TextInput
                  type="text"
                  value={gradeInput}
                  onChange={(event) => setGradeInput(event.target.value)}
                />
              </Field>
              {saveError ? (
                <p style={{ color: "#dc2626", margin: 0 }}>{saveError}</p>
              ) : null}
              <div style={{ display: "flex", gap: "12px" }}>
                <PrimaryButton
                  onClick={handleSave}
                  loading={saving}
                  loadingText="Saving..."
                >
                  保存
                </PrimaryButton>
                <SecondaryButton onClick={handleCancelEdit} disabled={saving}>
                  キャンセル
                </SecondaryButton>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <SecondaryButton
              onClick={() => router.push(`/children/${child.id}/daily`)}
            >
              今日の学習
            </SecondaryButton>
            <SecondaryButton
              onClick={() => router.push(`/children/${child.id}/summary`)}
            >
              学習サマリー
            </SecondaryButton>
            <SecondaryButton
              onClick={() => router.push(`/children/${child.id}/tasks`)}
            >
              タスク管理
            </SecondaryButton>
            <SecondaryButton disabled>カレンダー</SecondaryButton>
          </div>
        </div>
      )}
    </AppShell>
  );
}
