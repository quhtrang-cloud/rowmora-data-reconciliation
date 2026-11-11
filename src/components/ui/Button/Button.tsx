
import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const buttonClass = [
    styles.button,
    styles[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={buttonClass}
      {...props}
    >
      {children}
    </button>
  );
}
