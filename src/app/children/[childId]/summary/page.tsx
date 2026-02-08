"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import UserBadge from "@/components/UserBadge";

type SummaryItem = {
  minutes: number;
  subject?: string;
  name?: string;
  task_id?: string;
  date?: string;
};

type SummaryResponse = {
  from: string;
  to: string;
  total_minutes: number;
  by_day: SummaryItem[];
  by_subject: SummaryItem[];
  by_task: SummaryItem[];
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

const getWeekRange = (base: Date) => {
  const day = base.getDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { from: formatDate(start), to: formatDate(end) };
};

const getMonthRange = (base: Date) => {
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { from: formatDate(start), to: formatDate(end) };
};

const formatMinutes = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
};

export default function SummaryPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params?.childId;
  const token = useMemo(() => getToken(), []);
  const today = useMemo(() => new Date(), []);

  const [mode, setMode] = useState<"week" | "month" | "range">("week");
  const [range, setRange] = useState(() => getWeekRange(today));
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!token || typeof childId !== "string") {
      return;
    }
    setStatus("loading");
    setError(null);

    try {
      const data = await apiFetch<SummaryResponse>(
        `/children/${childId}/summary?from=${range.from}&to=${range.to}`,
        { token }
      );
      setSummary(data);
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
  }, [childId, range.from, range.to, router, token]);

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

    void fetchSummary();
  }, [childId, fetchSummary, router, token]);

  const handleModeChange = (nextMode: "week" | "month" | "range") => {
    setMode(nextMode);
    if (nextMode === "week") {
      setRange(getWeekRange(new Date()));
      return;
    }
    if (nextMode === "month") {
      setRange(getMonthRange(new Date()));
      return;
    }
  };

  const handleRangeChange = (key: "from" | "to", value: string) => {
    setRange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppShell>
      <TopBar
        title="学習サマリー"
        backHref={`/children/${childId}`}
        actions={<UserBadge />}
      />

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <SecondaryButton
          onClick={() => handleModeChange("week")}
          disabled={mode === "week"}
        >
          今週
        </SecondaryButton>
        <SecondaryButton
          onClick={() => handleModeChange("month")}
          disabled={mode === "month"}
        >
          今月
        </SecondaryButton>
        <SecondaryButton
          onClick={() => handleModeChange("range")}
          disabled={mode === "range"}
        >
          期間指定
        </SecondaryButton>
      </div>

      {mode === "range" && (
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <Field label="From">
            <TextInput
              type="date"
              value={range.from}
              onChange={(event) => handleRangeChange("from", event.target.value)}
            />
          </Field>
          <Field label="To">
            <TextInput
              type="date"
              value={range.to}
              onChange={(event) => handleRangeChange("to", event.target.value)}
            />
          </Field>
          <PrimaryButton onClick={fetchSummary}>再取得</PrimaryButton>
        </div>
      )}

      {status === "loading" && <p>Loading...</p>}

      {status === "error" && (
        <div style={{ display: "grid", gap: "12px" }}>
          <p>読み込みに失敗しました: {error?.message ?? "不明なエラー"}</p>
          <SecondaryButton onClick={fetchSummary}>再試行</SecondaryButton>
        </div>
      )}

      {status === "success" && summary && (
        <div style={{ display: "grid", gap: "16px" }}>
          <div>
            <p style={{ margin: 0 }}>
              期間: {summary.from} 〜 {summary.to}
            </p>
            <p style={{ margin: 0, fontWeight: 600 }}>
              合計: {formatMinutes(summary.total_minutes)}
            </p>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>科目別</h2>
            {summary.by_subject.length === 0 ? (
              <p>データなし</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>
                      科目
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 0" }}>
                      時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_subject.map((item, index) => (
                    <tr key={`${item.subject ?? "subject"}-${index}`}>
                      <td style={{ padding: "4px 0" }}>
                        {item.subject ?? "不明"}
                      </td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>
                        {formatMinutes(item.minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>タスク別</h2>
            {summary.by_task.length === 0 ? (
              <p>データなし</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>
                      タスク
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 0" }}>
                      時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_task.map((item, index) => (
                    <tr key={`${item.task_id ?? item.name ?? "task"}-${index}`}>
                      <td style={{ padding: "4px 0" }}>
                        {item.name ?? item.task_id ?? "不明"}
                      </td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>
                        {formatMinutes(item.minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ margin: 0, fontSize: "16px" }}>日別</h2>
            {summary.by_day.length === 0 ? (
              <p>データなし</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 0" }}>
                      日付
                    </th>
                    <th style={{ textAlign: "right", padding: "4px 0" }}>
                      時間
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_day.map((item, index) => (
                    <tr key={`${item.date ?? "day"}-${index}`}>
                      <td style={{ padding: "4px 0" }}>
                        {item.date ?? "不明"}
                      </td>
                      <td style={{ textAlign: "right", padding: "4px 0" }}>
                        {formatMinutes(item.minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
