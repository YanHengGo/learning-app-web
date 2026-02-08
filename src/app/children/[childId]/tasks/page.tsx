"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { DateInput, Field, NumberInput, TextArea, TextInput } from "@/components/Field";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import UserBadge from "@/components/UserBadge";

type Task = {
  id: string;
  name: string;
  subject: string;
  description?: string | null;
  default_minutes: number;
  days_mask: number;
  is_archived?: boolean;
  sort_order?: number;
  start_date?: string | null;
  end_date?: string | null;
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

const toDateInputValue = (value?: string | null) =>
  value ? value.slice(0, 10) : "";

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
  const [reordering, setReordering] = useState(false);
  const [reorderMessage, setReorderMessage] = useState<string | null>(null);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [defaultMinutes, setDefaultMinutes] = useState("30");
  const [days, setDays] = useState<boolean[]>(
    DAYS.map(() => false)
  );
  const [isArchived, setIsArchived] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const allDaysSelected = days.every(Boolean);

  const resetForm = () => {
    setEditingTaskId(null);
    setName("");
    setSubject("");
    setDescription("");
    setDefaultMinutes("30");
    setDays(DAYS.map(() => false));
    setIsArchived(false);
    setStartDate("");
    setEndDate("");
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
    setStartDate(toDateInputValue(task.start_date));
    setEndDate(toDateInputValue(task.end_date));
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

    if (startDate && endDate && startDate > endDate) {
      setSaveError("開始日は終了日以前に設定してください");
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
      start_date: startDate ? startDate : null,
      end_date: endDate ? endDate : null,
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

  const moveTask = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }
    setTasks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setReorderMessage(null);
  };

  const handleReorderSave = async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setReordering(true);
    setSaveError(null);
    setReorderMessage(null);

    try {
      const items = tasks.map((task, index) => ({
        task_id: task.id,
        sort_order: index,
      }));
      await apiFetch(`/children/${childId}/tasks/reorder`, {
        method: "PUT",
        token,
        body: { items },
      });
      setReorderMessage("保存しました");
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
      setSaveError(`並び替えに失敗しました: ${message}`);
    } finally {
      setReordering(false);
    }
  };

  return (
    <AppShell>
      <TopBar
        title="タスク管理"
        backHref={`/children/${childId}`}
        actions={<UserBadge />}
      />

      <div style={{ display: "grid", gap: "24px" }}>
        <section style={{ display: "grid", gap: "12px", maxWidth: "520px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              {editingTaskId ? "タスク編集" : "タスク追加"}
            </h2>
            {editingTaskId ? (
              <SecondaryButton onClick={resetForm} disabled={saving}>
                新規作成に戻す
              </SecondaryButton>
            ) : null}
          </div>
          <Field label="名前">
            <TextInput
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="科目">
            <TextInput
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="説明">
            <TextArea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </Field>
          <Field label="デフォルト分数">
            <NumberInput
              min={0}
              value={defaultMinutes}
              onChange={(event) => setDefaultMinutes(event.target.value)}
            />
          </Field>
          <Field label="開始日">
            <DateInput
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="終了日">
            <DateInput
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </Field>
          <div style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "13px", color: "#334155" }}>曜日</span>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: "4px" }}>
                <input
                  type="checkbox"
                  checked={allDaysSelected}
                  onChange={() =>
                    setDays((prev) => prev.map(() => !allDaysSelected))
                  }
                />
                全曜日
              </label>
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
          <PrimaryButton
            onClick={handleSubmit}
            loading={saving}
            loadingText="Saving..."
          >
            保存
          </PrimaryButton>
        </section>

        <section style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>タスク一覧</h2>
            <SecondaryButton onClick={fetchTasks}>再取得</SecondaryButton>
          </div>

          {status === "loading" && <p>Loading...</p>}

          {status === "error" && (
            <div style={{ display: "grid", gap: "8px" }}>
              <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
              <SecondaryButton onClick={fetchTasks}>再試行</SecondaryButton>
            </div>
          )}

          {status === "success" && (
            <div style={{ display: "grid", gap: "8px" }}>
              {tasks.length === 0 ? (
                <p>タスクがありません</p>
              ) : (
                tasks.map((task, index) => (
                  <div
                    key={task.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "grid",
                      gap: "6px",
                      background: "#ffffff",
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
                      <div style={{ display: "flex", gap: "8px" }}>
                        <SecondaryButton
                          onClick={() => moveTask(index, index - 1)}
                          disabled={index === 0 || reordering}
                        >
                          ↑
                        </SecondaryButton>
                        <SecondaryButton
                          onClick={() => moveTask(index, index + 1)}
                          disabled={index === tasks.length - 1 || reordering}
                        >
                          ↓
                        </SecondaryButton>
                        <SecondaryButton onClick={() => handleEdit(task)}>
                          編集
                        </SecondaryButton>
                      </div>
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
                    <p style={{ margin: 0, color: "#64748b" }}>
                      開始日:{" "}
                      {task.start_date
                        ? toDateInputValue(task.start_date)
                        : "未設定"}{" "}
                      / 終了日:{" "}
                      {task.end_date ? toDateInputValue(task.end_date) : "未設定"}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
          {tasks.length > 0 ? (
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <PrimaryButton
                onClick={handleReorderSave}
                loading={reordering}
                loadingText="保存中..."
              >
                並び順を保存
              </PrimaryButton>
              {reorderMessage ? (
                <p style={{ margin: 0, color: "#16a34a" }}>
                  {reorderMessage}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
