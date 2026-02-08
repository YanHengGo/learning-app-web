import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

const labelStyle: CSSProperties = {
  display: "grid",
  gap: "6px",
  fontSize: "13px",
  color: "#334155",
};

const inputStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5f5",
  fontSize: "14px",
  outline: "none",
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  lineHeight: 1.5,
  resize: "vertical",
};

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label style={labelStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />;
}

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const handlePicker = (
    event: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
  ) => {
    const input = event.currentTarget as HTMLInputElement & {
      showPicker?: () => void;
    };
    try {
      input.showPicker?.();
    } catch {
      // Some browsers throw if showPicker is not allowed.
    }
    props.onClick?.(event as React.MouseEvent<HTMLInputElement>);
  };

  return (
    <input
      {...props}
      type="date"
      onClick={handlePicker}
      style={{ ...inputStyle, width: "100%", display: "block", ...props.style }}
    />
  );
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type="number"
      style={{ ...inputStyle, ...props.style }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...textareaStyle, ...props.style }} />;
}
