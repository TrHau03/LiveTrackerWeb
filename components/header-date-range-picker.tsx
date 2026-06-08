"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Check } from "lucide-react";

interface HeaderDateRangePickerProps {
  startDate: string | null; // DD-MM-YYYY
  endDate: string | null;   // DD-MM-YYYY
  onDateRangeChange: (startIso: string, endIso: string) => void;
  theme: string;
}

export function HeaderDateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  theme
}: HeaderDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse display dates (DD-MM-YYYY) back to Date objects
  const parseDateStr = (dateStr: string | null): Date => {
    if (!dateStr) return new Date();
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Temp state inside popover before clicking "Apply"
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Calendar navigation state (which month/year is currently being viewed)
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Initialize temp dates when popover opens or props change
  useEffect(() => {
    if (isOpen) {
      const start = parseDateStr(startDate);
      const end = parseDateStr(endDate);
      setTempStart(start);
      setTempEnd(end);
      setCurrentMonth(start || new Date());
    }
  }, [isOpen, startDate, endDate]);

  // Click outside listener to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDayClick = (date: Date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (date < tempStart) {
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      // Set to start of day and end of day respectively
      const start = new Date(tempStart);
      start.setHours(0, 0, 0, 0);

      const end = new Date(tempEnd);
      end.setHours(23, 59, 59, 999);

      onDateRangeChange(start.toISOString(), end.toISOString());
      setIsOpen(false);
    }
  };

  const selectPreset = (daysOffset: number, isMonthRange = false) => {
    const end = new Date();
    let start = new Date();

    if (isMonthRange) {
      if (daysOffset === 0) {
        // This Month
        start = new Date(end.getFullYear(), end.getMonth(), 1);
      } else if (daysOffset === -1) {
        // Last Month
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        end.setDate(0); // Last day of previous month
      }
    } else {
      start.setDate(end.getDate() - daysOffset);
    }

    setTempStart(start);
    setTempEnd(end);
    setCurrentMonth(start);
  };

  // Render calendar helper functions
  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startDayOfWeek = (date: Date) => {
    // 0: Sunday, 1: Monday, etc. We map so Monday is 0 for Vietnamese calendar standard if needed, or stick to 0=Sunday
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (tempStart && date.getTime() === tempStart.getTime()) return "start";
    if (tempEnd && date.getTime() === tempEnd.getTime()) return "end";
    return null;
  };

  const isInRange = (date: Date) => {
    if (tempStart && tempEnd) {
      return date > tempStart && date < tempEnd;
    }
    if (tempStart && hoverDate && !tempEnd) {
      return date > tempStart && date <= hoverDate;
    }
    return false;
  };

  const renderDays = () => {
    const totalDays = daysInMonth(currentMonth);
    const startWeekDay = startDayOfWeek(currentMonth);
    const days = [];

    // Empty cells for days of previous month
    for (let i = 0; i < startWeekDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const selectType = isSelected(date);
      const inRange = isInRange(date);
      const today = isToday(date);

      let dayClasses = "h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition cursor-pointer select-none relative ";
      
      if (selectType === "start" || selectType === "end") {
        dayClasses += "bg-[var(--primary)] text-white z-10 shadow-sm shadow-blue-500/20";
      } else if (inRange) {
        dayClasses += "bg-[var(--primary-soft)] text-[var(--primary)] rounded-full hover:bg-[var(--primary-soft)]/80";
      } else if (today) {
        dayClasses += "border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--hover)]";
      } else {
        dayClasses += "text-[var(--foreground)] hover:bg-[var(--hover)]";
      }

      days.push(
        <div
          key={`day-${day}`}
          className="h-8 w-8 flex items-center justify-center relative"
          onClick={() => handleDayClick(date)}
          onMouseEnter={() => !tempEnd && setHoverDate(date)}
          onMouseLeave={() => setHoverDate(null)}
        >
          <button className={dayClasses}>
            {day}
          </button>
        </div>
      );
    }

    return days;
  };

  const monthsVi = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const presets = [
    { label: "Hôm nay", action: () => selectPreset(0) },
    { label: "Hôm qua", action: () => selectPreset(1) },
    { label: "7 ngày qua", action: () => selectPreset(7) },
    { label: "30 ngày qua", action: () => selectPreset(30) },
    { label: "Tháng này", action: () => selectPreset(0, true) },
    { label: "Tháng trước", action: () => selectPreset(-1, true) },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      {/* Target Triggers: Styled Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3.5 py-2 text-xs font-semibold text-[var(--foreground-soft)] border transition cursor-pointer select-none shadow-sm hover:border-[var(--primary)] ${
          isOpen ? "border-[var(--primary)] ring-2 ring-blue-100 dark:ring-blue-900/30" : "border-[var(--border)]"
        }`}
      >
        <Calendar className="h-3.5 w-3.5 text-[var(--muted)]" />
        <span className="font-mono">{startDate || "10-06-2021"}</span>
        <span className="text-[var(--muted)] font-normal mx-0.5">→</span>
        <span className="font-mono">{endDate || "10-10-2021"}</span>
      </div>

      {/* Popover content */}
      <div className={`absolute right-0 top-full mt-2 z-50 flex flex-col md:flex-row bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden p-1.5 backdrop-blur-md bg-white/95 dark:bg-[#1A1D26]/95 w-[560px] max-w-[95vw] transition-all duration-200 origin-top-right ${
        isOpen
          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
          : "opacity-0 translate-y-[-8px] scale-95 pointer-events-none"
      }`}>
        
        {/* Quick presets (Sidebar in Popover) */}
        <div className="flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-[var(--border)] p-2 md:w-36 shrink-0 flex-wrap">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={preset.action}
              className="flex-1 md:flex-none text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-colors whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Calendar Picker Area */}
        <div className="flex-1 p-3 flex flex-col">
          
          {/* Header controls for Calendar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold text-[var(--foreground)]">
              {monthsVi[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] text-[var(--foreground-soft)] transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] text-[var(--foreground-soft)] transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Week days labels */}
          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[var(--muted)] mb-2 uppercase tracking-wider">
            <div>CN</div>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
          </div>

          {/* Grid days */}
          <div className="grid grid-cols-7 gap-y-0.5 justify-items-center text-center">
            {renderDays()}
          </div>

          {/* Actions Footer */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
            <div className="text-[10px] font-medium text-[var(--muted)]">
              {tempStart && (
                <span className="font-mono text-[var(--foreground-soft)] font-semibold">
                  {tempStart.toLocaleDateString("vi-VN")}
                </span>
              )}
              {tempStart && tempEnd && (
                <>
                  <span className="mx-1">đến</span>
                  <span className="font-mono text-[var(--foreground-soft)] font-semibold">
                    {tempEnd.toLocaleDateString("vi-VN")}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 px-3 rounded-lg border border-[var(--border)] bg-transparent text-xs font-semibold text-[var(--foreground-soft)] hover:bg-[var(--hover)] transition"
              >
                Hủy
              </button>
              <button
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className="h-8 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-strong)] disabled:opacity-50 disabled:pointer-events-none transition flex items-center gap-1 shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                Áp dụng
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
