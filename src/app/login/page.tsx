"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(data.token);
      router.push("/children");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("メールアドレスまたはパスワードが違います");
      } else {
        setError("ログインに失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>ログイン</h1>
        <label>
          メールアドレス
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            name="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "ログイン中..." : "ログイン"}
        </button>
      </form>
      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: #f5f6f8;
        }
        .login-card {
          width: min(100%, 420px);
          background: #ffffff;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 24px;
        }
        label {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
        }
        input {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5f5;
          font-size: 14px;
        }
        button {
          margin-top: 8px;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: #1d4ed8;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error {
          color: #dc2626;
          font-size: 14px;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
