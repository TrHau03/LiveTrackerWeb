"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  minWidth?: string;
  heightClass?: string;
}

export function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Chọn giá trị",
  className = "",
  minWidth = "150px",
  heightClass = "h-10",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative w-full sm:w-auto ${className}`} ref={dropdownRef} style={{ minWidth }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${heightClass} px-3.5 pr-10 w-full rounded-lg border text-xs font-semibold flex items-center justify-between gap-2.5 transition-all select-none shadow-sm cursor-pointer text-left bg-[var(--surface)] ${
          isOpen
            ? "border-[var(--primary)] text-[var(--primary)] ring-2 ring-blue-100 dark:ring-blue-900/30"
            : "border-[var(--border)] text-[var(--foreground-soft)] hover:border-[var(--primary)] hover:bg-[var(--hover)]"
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown 
          className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>

      {/* Popover list */}
      <div 
        className={`absolute right-0 sm:left-0 top-full mt-2 z-50 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden p-1 backdrop-blur-md bg-white/98 dark:bg-[#1A1D26]/98 w-full min-w-[175px] transition-all duration-200 origin-top-left ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-[-8px] scale-95 pointer-events-none"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onChange("");
            setIsOpen(false);
          }}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
            value === "" 
              ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold" 
              : "text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
          }`}
        >
          <span>{placeholder}</span>
          {value === "" && <Check className="w-3.5 h-3.5 text-[var(--primary)]" />}
        </button>
        
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setIsOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
              value === opt.value 
                ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold" 
                : "text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
            }`}
          >
            <span className="truncate">{opt.label}</span>
            {value === opt.value && <Check className="w-3.5 h-3.5 text-[var(--primary)]" />}
          </button>
        ))}
      </div>
    </div>
  );
}
