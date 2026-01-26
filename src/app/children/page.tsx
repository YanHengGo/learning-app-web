"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearToken, getToken } from "@/lib/auth";

export default function ChildrenPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  if (!ready) {
    return null;
  }

  return (
    <div style={{ padding: "40px" }}>
      <h1>ログイン中</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
