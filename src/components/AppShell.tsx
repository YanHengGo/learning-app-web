import type { CSSProperties, ReactNode } from "react";

const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
};

const containerStyle: CSSProperties = {
  maxWidth: "960px",
  margin: "0 auto",
  padding: "24px",
};

type AppShellProps = {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function AppShell({ title, actions, children }: AppShellProps) {
  return (
    <div style={shellStyle}>
      <div style={containerStyle}>
        {(title || actions) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {title ? (
              <h1 style={{ margin: 0, fontSize: "28px" }}>{title}</h1>
            ) : (
              <div />
            )}
            {actions ? (
              <div style={{ display: "flex", gap: "8px" }}>{actions}</div>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
