import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

const baseStyle: CSSProperties = {
  borderRadius: "10px",
  padding: "10px 16px",
  fontSize: "14px",
  fontWeight: 600,
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "opacity 0.2s ease",
};

const primaryStyle: CSSProperties = {
  ...baseStyle,
  background: "#2563eb",
  color: "#ffffff",
};

const secondaryStyle: CSSProperties = {
  ...baseStyle,
  background: "#ffffff",
  color: "#1f2937",
  borderColor: "#cbd5f5",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
};

const resolveLabel = (loading: boolean, loadingText: string | undefined, children: ReactNode) =>
  loading ? loadingText ?? "Loading..." : children;

export function PrimaryButton({
  loading = false,
  loadingText,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      style={{
        ...primaryStyle,
        ...(style ?? {}),
        opacity: isDisabled ? 0.6 : 1,
      }}
      disabled={isDisabled}
    >
      {resolveLabel(loading, loadingText, children)}
    </button>
  );
}

export function SecondaryButton({
  loading = false,
  loadingText,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      style={{
        ...secondaryStyle,
        ...(style ?? {}),
        opacity: isDisabled ? 0.6 : 1,
      }}
      disabled={isDisabled}
    >
      {resolveLabel(loading, loadingText, children)}
    </button>
  );
}
