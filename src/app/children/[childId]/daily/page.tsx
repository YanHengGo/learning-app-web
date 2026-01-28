"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

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

type CalendarStatus = "white" | "green" | "yellow" | "red";

type CalendarSummary = {
  days: { date: string; status: CalendarStatus }[];
};

type Status = "idle" | "loading" | "success" | "error";

type ErrorInfo = {
  message: string;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const getMonthRange = (year: number, month: number) => {
  const from = formatDate(new Date(year, month, 1));
  const endDate = new Date(year, month + 1, 0);
  const to = formatDate(endDate);
  return { from, to, lastDay: endDate.getDate() };
};

export default function DailyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const childId = params?.childId;
  const token = useMemo(() => getToken(), []);
  const today = useMemo(() => formatDate(new Date()), []);
  const dateParam = searchParams?.get("date") ?? "";
  const selectedDate = dateParam || today;
  const selectedDateValue = useMemo(
    () => parseDate(selectedDate),
    [selectedDate]
  );

  const [status, setStatus] = useState<Status>("idle");
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [monthState, setMonthState] = useState(() => {
    const base = selectedDateValue ?? new Date();
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [calendarStatus, setCalendarStatus] = useState<Status>("idle");
  const [calendarError, setCalendarError] = useState<ErrorInfo | null>(null);
  const [calendarDays, setCalendarDays] = useState<
    Record<string, CalendarStatus>
  >({});

  const fetchDaily = useCallback(async () => {
    if (!token || typeof childId !== "string" || !selectedDateValue) {
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const data = await apiFetch<DailyView>(
        `/children/${childId}/daily-view?date=${selectedDate}`,
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
  }, [childId, router, selectedDate, selectedDateValue, token]);

  const fetchCalendar = useCallback(async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setCalendarStatus("loading");
    setCalendarError(null);

    try {
      const { from, to } = getMonthRange(monthState.year, monthState.month);
      const data = await apiFetch<CalendarSummary>(
        `/children/${childId}/calendar-summary?from=${from}&to=${to}`,
        { token }
      );
      const nextMap: Record<string, CalendarStatus> = {};
      for (const day of data.days ?? []) {
        nextMap[day.date] = day.status;
      }
      setCalendarDays(nextMap);
      setCalendarStatus("success");
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
      setCalendarError({ message });
      setCalendarStatus("error");
    }
  }, [childId, monthState.month, monthState.year, router, token]);

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

    if (!dateParam) {
      router.replace(`/children/${childId}/daily?date=${today}`);
      return;
    }

    if (!selectedDateValue) {
      setError({ message: "日付が不正です" });
      setStatus("error");
      return;
    }

    void fetchDaily();
  }, [childId, dateParam, fetchDaily, router, selectedDateValue, today, token]);

  useEffect(() => {
    if (!selectedDateValue) {
      return;
    }
    const nextYear = selectedDateValue.getFullYear();
    const nextMonth = selectedDateValue.getMonth();
    setMonthState((prev) =>
      prev.year === nextYear && prev.month === nextMonth
        ? prev
        : { year: nextYear, month: nextMonth }
    );
  }, [selectedDateValue]);

  useEffect(() => {
    if (!token) {
      return;
    }
    if (typeof childId !== "string") {
      return;
    }
    void fetchCalendar();
  }, [childId, fetchCalendar, token]);

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
    if (!token || typeof childId !== "string" || !selectedDateValue) {
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

      await apiFetch(`/children/${childId}/daily?date=${selectedDate}`, {
        method: "PUT",
        token,
        body: { items },
      });

      await fetchDaily();
      await fetchCalendar();
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
    <AppShell>
      <TopBar title="今日の学習" backHref={`/children/${childId}`} />

      <div style={{ marginBottom: "16px" }}>
        <p style={{ margin: 0, color: "#475569" }}>{selectedDate}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 320px) minmax(0, 1fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <SecondaryButton
              onClick={() =>
                setMonthState((prev) => {
                  const date = new Date(prev.year, prev.month - 1, 1);
                  return { year: date.getFullYear(), month: date.getMonth() };
                })
              }
            >
              前月
            </SecondaryButton>
            <span>
              {monthState.year}-{`${monthState.month + 1}`.padStart(2, "0")}
            </span>
            <SecondaryButton
              onClick={() =>
                setMonthState((prev) => {
                  const date = new Date(prev.year, prev.month + 1, 1);
                  return { year: date.getFullYear(), month: date.getMonth() };
                })
              }
            >
              次月
            </SecondaryButton>
          </div>

          {calendarStatus === "loading" && <p>Loading...</p>}
          {calendarStatus === "error" && (
            <div style={{ display: "grid", gap: "8px" }}>
              <p>
                読み込みに失敗しました:{" "}
                {calendarError?.message ?? "不明なエラー"}
              </p>
              <SecondaryButton onClick={fetchCalendar}>再取得</SecondaryButton>
            </div>
          )}
          {calendarStatus === "success" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: "6px",
              }}
            >
              {(() => {
                const firstDay = new Date(
                  monthState.year,
                  monthState.month,
                  1
                ).getDay();
                const { lastDay } = getMonthRange(
                  monthState.year,
                  monthState.month
                );
                const cells = [];

                for (let i = 0; i < firstDay; i += 1) {
                  cells.push(
                    <div
                      key={`blank-${i}`}
                      style={{ minHeight: "36px" }}
                    />
                  );
                }

                for (let day = 1; day <= lastDay; day += 1) {
                  const dateString = formatDate(
                    new Date(monthState.year, monthState.month, day)
                  );
                  const status = calendarDays[dateString];
                  const isSelected = dateString === selectedDate;
                  const background =
                    status === "green"
                      ? "#dcfce7"
                      : status === "yellow"
                        ? "#fef9c3"
                        : status === "red"
                          ? "#fee2e2"
                          : "#f8fafc";
                  cells.push(
                    <button
                      key={dateString}
                      onClick={() =>
                        router.push(
                          `/children/${childId}/daily?date=${dateString}`
                        )
                      }
                      style={{
                        padding: "6px 0",
                        borderRadius: "6px",
                        border: isSelected
                          ? "2px solid #2563eb"
                          : "1px solid #e2e8f0",
                        background,
                        fontWeight: isSelected ? 700 : 400,
                        cursor: "pointer",
                      }}
                    >
                      {day}
                    </button>
                  );
                }

                return cells;
              })()}
            </div>
          )}
        </div>

        <div>
          {status === "loading" && <p>Loading...</p>}

          {status === "error" && (
            <div style={{ display: "grid", gap: "12px" }}>
              <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
              <SecondaryButton onClick={fetchDaily}>再取得</SecondaryButton>
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
                        borderRadius: "12px",
                        padding: "12px 16px",
                        background: "#ffffff",
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
              <PrimaryButton
                onClick={handleSave}
                loading={saving}
                loadingText="Saving..."
              >
                保存
              </PrimaryButton>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
