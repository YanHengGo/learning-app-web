"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type Task = {
  id: string;
  name: string;
  subject: string;
  description?: string | null;
  default_minutes: number;
  days_mask: number;
  is_archived?: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

type ErrorInfo = {
  message: string;
};

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];

const maskToDays = (mask: number) =>
  DAYS.map((_, index) => Boolean(mask & (1 << index)));

const daysToMask = (days: boolean[]) =>
  days.reduce((acc, checked, index) => acc + (checked ? 1 << index : 0), 0);

export default function TasksPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params?.childId;
  const token = useMemo(() => getToken(), []);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [defaultMinutes, setDefaultMinutes] = useState("30");
  const [days, setDays] = useState<boolean[]>(
    DAYS.map(() => false)
  );
  const [isArchived, setIsArchived] = useState(false);

  const resetForm = () => {
    setEditingTaskId(null);
    setName("");
    setSubject("");
    setDescription("");
    setDefaultMinutes("30");
    setDays(DAYS.map(() => false));
    setIsArchived(false);
    setSaveError(null);
  };

  const fetchTasks = async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const data = await apiFetch<Task[]>(`/children/${childId}/tasks`, {
        token,
      });
      setTasks(data);
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
    void fetchTasks();
  }, [childId, token, router]);

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setName(task.name);
    setSubject(task.subject);
    setDescription(task.description ?? "");
    setDefaultMinutes(String(task.default_minutes));
    setDays(maskToDays(task.days_mask));
    setIsArchived(Boolean(task.is_archived));
    setSaveError(null);
  };

  const handleDayToggle = (index: number) => {
    setDays((prev) =>
      prev.map((checked, i) => (i === index ? !checked : checked))
    );
  };

  const handleSubmit = async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    if (!name.trim()) {
      setSaveError("名前は必須です");
      return;
    }
    if (!subject.trim()) {
      setSaveError("科目は必須です");
      return;
    }

    if (!days.some(Boolean)) {
      setSaveError("曜日は最低1つ選択してください");
      return;
    }

    const minutesValue = Number(defaultMinutes);
    if (Number.isNaN(minutesValue)) {
      setSaveError("デフォルト分数が不正です");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      name: name.trim(),
      subject: subject.trim(),
      description: description.trim() ? description.trim() : undefined,
      default_minutes: minutesValue,
      days_mask: daysToMask(days),
      is_archived: isArchived,
    };

    try {
      if (editingTaskId) {
        await apiFetch(`/children/${childId}/tasks/${editingTaskId}`, {
          method: "PUT",
          token,
          body: payload,
        });
      } else {
        await apiFetch(`/children/${childId}/tasks`, {
          method: "POST",
          token,
          body: payload,
        });
      }
      await fetchTasks();
      resetForm();
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
      setSaveError(`保存に失敗しました: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <button
        onClick={() => router.push(`/children/${childId}`)}
        style={{ marginBottom: "16px" }}
      >
        ← 子供詳細へ戻る
      </button>

      <h1 style={{ margin: "0 0 16px" }}>タスク管理</h1>

      <div style={{ display: "grid", gap: "24px" }}>
        <section style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              {editingTaskId ? "タスク編集" : "タスク追加"}
            </h2>
            {editingTaskId ? (
              <button onClick={resetForm} disabled={saving}>
                新規作成に戻す
              </button>
            ) : null}
          </div>
          <label style={{ display: "grid", gap: "6px" }}>
            名前
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            科目
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            説明
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </label>
          <label style={{ display: "grid", gap: "6px" }}>
            デフォルト分数
            <input
              type="number"
              min={0}
              value={defaultMinutes}
              onChange={(event) => setDefaultMinutes(event.target.value)}
            />
          </label>
          <div style={{ display: "grid", gap: "6px" }}>
            <span>曜日</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {DAYS.map((label, index) => (
                <label key={label} style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="checkbox"
                    checked={days[index]}
                    onChange={() => handleDayToggle(index)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={isArchived}
              onChange={(event) => setIsArchived(event.target.checked)}
            />
            アーカイブ
          </label>
          {saveError ? (
            <p style={{ color: "#dc2626", margin: 0 }}>{saveError}</p>
          ) : null}
          <button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "保存"}
          </button>
        </section>

        <section style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>タスク一覧</h2>
            <button onClick={fetchTasks}>再取得</button>
          </div>

          {status === "loading" && <p>Loading...</p>}

          {status === "error" && (
            <div style={{ display: "grid", gap: "8px" }}>
              <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
              <button onClick={fetchTasks}>再試行</button>
            </div>
          )}

          {status === "success" && (
            <div style={{ display: "grid", gap: "8px" }}>
              {tasks.length === 0 ? (
                <p>タスクがありません</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "grid",
                      gap: "6px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>
                          {task.name}
                        </p>
                        <p style={{ margin: 0, color: "#475569" }}>
                          {task.subject} / {task.default_minutes}分
                        </p>
                      </div>
                      <button onClick={() => handleEdit(task)}>編集</button>
                    </div>
                    {task.description ? (
                      <p style={{ margin: 0, color: "#64748b" }}>
                        {task.description}
                      </p>
                    ) : null}
                    <p style={{ margin: 0, color: "#64748b" }}>
                      曜日: {maskToDays(task.days_mask)
                        .map((checked, index) =>
                          checked ? DAYS[index] : null
                        )
                        .filter(Boolean)
                        .join(" ") || "未設定"}
                      {task.is_archived ? " / アーカイブ" : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
