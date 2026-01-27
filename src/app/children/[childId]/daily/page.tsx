"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

type DailyTask = {
  task_id: string;
  subject: string;
  name: string;
  minutes: number;
  is_done: boolean;
};

type DailyView = {
  tasks: DailyTask[];
};

type TaskState = DailyTask & {
  checked: boolean;
};

type Status = "idle" | "loading" | "success" | "error";

type ErrorInfo = {
  message: string;
};

export default function DailyPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params?.childId;
  const token = useMemo(() => getToken(), []);
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const [status, setStatus] = useState<Status>("idle");
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchDaily = useCallback(async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const data = await apiFetch<DailyView>(
        `/children/${childId}/daily-view?date=${today}`,
        { token }
      );
      const nextTasks = (data.tasks ?? []).map((task) => ({
        ...task,
        checked: task.is_done,
      }));
      setTasks(nextTasks);
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
  }, [childId, router, today, token]);

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

    void fetchDaily();
  }, [childId, fetchDaily, router, token]);

  const handleToggle = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.task_id === taskId
          ? { ...task, checked: !task.checked }
          : task
      )
    );
  };

  const handleMinutesChange = (taskId: string, value: string) => {
    const minutes = Number(value);
    if (Number.isNaN(minutes)) {
      return;
    }
    setTasks((prev) =>
      prev.map((task) =>
        task.task_id === taskId ? { ...task, minutes } : task
      )
    );
  };

  const handleSave = async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      const items = tasks
        .filter((task) => task.checked)
        .map((task) => ({
          task_id: task.task_id,
          minutes: task.minutes,
        }));

      await apiFetch(`/children/${childId}/daily?date=${today}`, {
        method: "PUT",
        token,
        body: { items },
      });

      await fetchDaily();
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

      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ margin: "0 0 8px" }}>今日の学習</h1>
        <p style={{ margin: 0, color: "#475569" }}>{today}</p>
      </div>

      {status === "loading" && <p>Loading...</p>}

      {status === "error" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
          <button onClick={fetchDaily}>再取得</button>
        </div>
      )}

      {status === "success" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {tasks.length === 0 ? (
            <p>タスクがありません</p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: "12px",
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px 16px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={() => handleToggle(task.task_id)}
                  />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>
                      {task.subject} {task.name}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={task.minutes}
                    onChange={(event) =>
                      handleMinutesChange(task.task_id, event.target.value)
                    }
                    disabled={!task.checked}
                    style={{ width: "80px" }}
                  />
                </div>
              ))}
            </div>
          )}

          {saveError ? (
            <p style={{ color: "#dc2626", margin: 0 }}>{saveError}</p>
          ) : null}
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "保存"}
          </button>
        </div>
      )}
    </div>
  );
}
