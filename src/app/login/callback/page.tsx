import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import TopBar from "@/components/TopBar";
import CallbackClient from "./CallbackClient";

export default function LoginCallbackPage() {
  return (
    <AppShell>
      <TopBar title="ログイン" backHref="/login" />
      <Suspense fallback={<p>Signing you in...</p>}>
        <CallbackClient />
      </Suspense>
    </AppShell>
  );
}
