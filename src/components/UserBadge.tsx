"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import type { UserProfile } from "@/types/user";

type MeResponse = {
  user: UserProfile;
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: "13px",
  fontWeight: 600,
};

const avatarStyle = {
  width: "28px",
  height: "28px",
  borderRadius: "999px",
  objectFit: "cover" as const,
  background: "#1d4ed8",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 700,
};

export default function UserBadge() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    let active = true;

    const fetchMe = async () => {
      setStatus("loading");
      try {
        const response = await apiFetch<MeResponse>("/me", { token });
        if (!active) {
          return;
        }
        setUser(response.user);
        setStatus("success");
      } catch (err) {
        if (!active) {
          return;
        }
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace("/login");
          return;
        }
        setStatus("error");
      }
    };

    void fetchMe();

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "loading") {
    return <span style={badgeStyle}>Loading...</span>;
  }

  if (status === "error" || !user) {
    return null;
  }

  const displayName = user.display_name?.trim() || user.email;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div style={badgeStyle}>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={displayName} style={avatarStyle} />
      ) : (
        <span style={avatarStyle}>{initial}</span>
      )}
      <span>{displayName}</span>
    </div>
  );
}
