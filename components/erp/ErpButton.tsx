"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ErpButton({
  children,
  icon: Icon,
  variant = "primary",
  onClick,
  type = "button",
  className
}: {
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "outline" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        variant === "primary" && "bg-[#4f5df5] text-white shadow-[0_10px_22px_rgba(79,93,245,0.28)] hover:bg-[#4350e0]",
        variant === "outline" && "border border-[#dfe3ee] bg-white text-[#101828] shadow-sm hover:border-[#c9d0e2]",
        variant === "ghost" && "text-[#5b6475] hover:bg-white",
        className
      )}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}
