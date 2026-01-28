import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

const backLinkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  textDecoration: "none",
  color: "#2563eb",
  fontWeight: 600,
  fontSize: "14px",
};

type TopBarProps = {
  title?: string;
  backHref?: string;
  actions?: ReactNode;
};

export default function TopBar({ title, backHref, actions }: TopBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {backHref ? (
          <Link href={backHref} style={backLinkStyle}>
            ← 戻る
          </Link>
        ) : null}
        {title ? <h1 style={{ margin: 0, fontSize: "28px" }}>{title}</h1> : null}
      </div>
      {actions ? (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
