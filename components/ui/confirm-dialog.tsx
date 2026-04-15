"use client";

import React from "react";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./workspace-shared";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy bỏ",
  onConfirm,
  onCancel,
  isDanger = false
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onCancel}
      />
      
      {/* Dialog Body */}
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {title}
            </h3>
            <div className="text-sm text-[var(--muted)] leading-relaxed">
              {message}
            </div>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2 mt-2">
            <button
              onClick={onCancel}
              className={`${SECONDARY_BUTTON_CLASS} px-6 rounded-xl border-none bg-[var(--surface-muted)]/50`}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`${PRIMARY_BUTTON_CLASS} px-6 rounded-xl ${isDanger ? 'bg-red-500 hover:bg-red-600' : ''}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
