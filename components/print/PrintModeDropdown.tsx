/**
 * PrintModeDropdown — Dropdown chọn chế độ in (In + Gửi / Chỉ in / Chỉ gửi).
 */
"use client";

import React, { useState, useRef, useEffect } from "react";
import type { PrintMode } from "@/types";

const PRINT_MODE_OPTIONS: {
  mode: PrintMode;
  label: string;
  icon: string;
  isDefault?: boolean;
}[] = [
  { mode: "print_and_send", label: "In + Gửi", icon: "🖨️✓", isDefault: true },
  { mode: "print_only", label: "Chỉ in", icon: "🖨️" },
  { mode: "send_only", label: "Chỉ gửi", icon: "📩" },
];

type Props = {
  onSelect: (mode: PrintMode) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function PrintModeDropdown({ onSelect, disabled, size = "sm", className }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const btnClass =
    size === "md"
      ? "flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 disabled:opacity-50"
      : "flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 disabled:opacity-50";

  return (
    <div className={`relative inline-block ${className || ""}`} ref={ref}>
      <div className="flex">
        {/* Main print button — default action */}
        <button
          onClick={() => onSelect("print_and_send")}
          disabled={disabled}
          className={btnClass + " rounded-r-none"}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          In đơn
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          disabled={disabled}
          className={
            (size === "md"
              ? "rounded-lg rounded-l-none border-l border-white/30 bg-[var(--primary)] px-2 py-2"
              : "rounded-md rounded-l-none border-l border-white/30 bg-[var(--primary)] px-1.5 py-1") +
            " text-white hover:bg-[var(--primary-strong)] transition disabled:opacity-50"
          }
        >
          <svg
            className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl z-[100] animate-in fade-in slide-in-from-top-2">
          {PRINT_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => {
                onSelect(opt.mode);
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.isDefault && (
                <span className="ml-auto text-[9px] font-bold text-[var(--primary)] bg-[color:var(--primary-soft)] px-1.5 py-0.5 rounded">
                  MẶC ĐỊNH
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
