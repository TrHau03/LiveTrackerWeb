"use client";

import React, { useState, useEffect, useRef } from "react";
import { pickString } from "@/lib/proxy-client";

interface CustomerTagDropdownProps {
  tags: Record<string, unknown>[];
  customerId: string;
  customerName: string;
  isNewCustomer?: boolean;
  onSave: (tagIds: string[]) => Promise<void>;
}

export function CustomerTagDropdown({
  tags,
  customerId,
  customerName,
  isNewCustomer,
  onSave,
}: CustomerTagDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newKeys = new Set(selectedIds);
    if (newKeys.has(id)) newKeys.delete(id);
    else newKeys.add(id);
    setSelectedIds(newKeys);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving || selectedIds.size === 0) return;
    setIsSaving(true);
    await onSave(Array.from(selectedIds));
    setIsSaving(false);
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity p-1 -m-1"
        title="Gắn thẻ khách hàng"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="mb-2 px-2 pb-2 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--foreground)] w-full truncate block" title={customerName}>
              {customerName}
            </span>
            {isNewCustomer && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 uppercase tracking-widest">
                Khách mới
              </span>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            {tags.map((tag) => {
              const id = pickString(tag, ["id", "_id"]) || "";
              const isSelected = selectedIds.has(id);
              return (
                <button
                  key={id}
                  onClick={(e) => toggleTag(id, e)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "bg-[color:var(--primary-soft)] text-[var(--primary)] font-semibold"
                      : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <span className="truncate">{pickString(tag, ["name", "label"]) || "Tag"}</span>
                  {isSelected && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedIds.size === 0}
              className="w-full rounded-lg bg-[var(--primary)] py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Đang lưu..." : "Lưu thẻ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
