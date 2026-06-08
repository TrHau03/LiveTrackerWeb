"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar, Check, ChevronDown } from "lucide-react";

interface OrdersDateRangePickerProps {
  period: string;
  startDate: string | null; // ISO string
  endDate: string | null;   // ISO string
  onPeriodChange: (period: string, startDate?: string, endDate?: string) => void;
}

export function OrdersDateRangePicker({
  period,
  startDate,
  endDate,
  onPeriodChange
}: OrdersDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse display dates back to Date objects
  const parseDateStr = (isoStr: string | null): Date | null => {
    if (!isoStr) return null;
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Temp state inside popover before clicking "Apply" for custom mode
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // localPeriod tracks the active selection in the UI before applying/closing
  const [localPeriod, setLocalPeriod] = useState<string>(period);

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Initialize temp dates when popover opens or props change
  useEffect(() => {
    if (isOpen) {
      const start = parseDateStr(startDate);
      const end = parseDateStr(endDate);
      setTempStart(start);
      setTempEnd(end);
      setLocalPeriod(period);
      setCurrentMonth(start || new Date());
    }
  }, [isOpen, startDate, endDate, period]);

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

  // Helper to calculate date range based on preset ID
  const getPresetRange = (preset: string) => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (preset) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: yesterdayEnd.toISOString() };
      case "7days":
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "30days":
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "thisMonth":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDay.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: firstDay.toISOString(), endDate: end.toISOString() };
      case "lastMonth":
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        firstDayLastMonth.setHours(0, 0, 0, 0);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);
        return { startDate: firstDayLastMonth.toISOString(), endDate: lastDayLastMonth.toISOString() };
      case "recent":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const handlePresetClick = (presetId: string) => {
    setLocalPeriod(presetId);
    if (presetId === "custom") {
      // Keep popover open, let user select custom date on calendar
      const start = parseDateStr(startDate) || new Date();
      setCurrentMonth(start);
    } else {
      // Calculate range and apply immediately for quick presets
      const range = getPresetRange(presetId);
      onPeriodChange(presetId, range.startDate, range.endDate);
      setIsOpen(false);
    }
  };

  const handleDayClick = (date: Date) => {
    // When clicking a date, automatically switch to custom mode in the UI
    setLocalPeriod("custom");

    if (!tempStart || (tempStart && tempEnd) || localPeriod !== "custom") {
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
      const start = new Date(tempStart);
      start.setHours(0, 0, 0, 0);

      const end = new Date(tempEnd);
      end.setHours(23, 59, 59, 999);

      onPeriodChange("custom", start.toISOString(), end.toISOString());
      setIsOpen(false);
    }
  };

  // Render calendar helper functions
  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const startDayOfWeek = (date: Date) => {
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
    // Determine start/end highlights
    if (localPeriod === "custom") {
      if (tempStart && date.toDateString() === tempStart.toDateString()) return "start";
      if (tempEnd && date.toDateString() === tempEnd.toDateString()) return "end";
    } else {
      // Highlight boundaries based on current active preset range
      const activeStart = parseDateStr(startDate);
      const activeEnd = parseDateStr(endDate);
      if (activeStart && date.toDateString() === activeStart.toDateString()) return "start";
      if (activeEnd && date.toDateString() === activeEnd.toDateString()) return "end";
    }
    return null;
  };

  const isInRange = (date: Date) => {
    if (localPeriod === "custom") {
      if (tempStart && tempEnd) {
        return date > tempStart && date < tempEnd;
      }
      if (tempStart && hoverDate && !tempEnd) {
        return date > tempStart && date <= hoverDate;
      }
    } else {
      const activeStart = parseDateStr(startDate);
      const activeEnd = parseDateStr(endDate);
      if (activeStart && activeEnd) {
        return date > activeStart && date < activeEnd;
      }
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
        dayClasses += "bg-[var(--primary-soft)] text-[var(--primary)] rounded-full hover:bg-[var(--primary-soft)]/85";
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
          onMouseEnter={() => localPeriod === "custom" && !tempEnd && setHoverDate(date)}
          onMouseLeave={() => setHoverDate(null)}
        >
          <button type="button" className={dayClasses}>
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

  // Format date to show on button
  const formatBtnDate = (isoStr: string | null) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  const getDisplayLabel = () => {
    switch (period) {
      case "today":
        return "Hôm nay";
      case "yesterday":
        return "Hôm qua";
      case "7days":
        return "7 ngày qua";
      case "30days":
        return "30 ngày qua";
      case "thisMonth":
        return "Tháng này";
      case "lastMonth":
        return "Tháng trước";
      case "recent":
        return "Tất cả thời gian";
      case "custom":
        if (startDate && endDate) {
          return `${formatBtnDate(startDate)} - ${formatBtnDate(endDate)}`;
        }
        return "Khoảng ngày";
      default:
        return "Chọn thời gian";
    }
  };

  const presets = [
    { id: "recent", label: "Tất cả thời gian" },
    { id: "today", label: "Hôm nay" },
    { id: "yesterday", label: "Hôm qua" },
    { id: "7days", label: "7 ngày qua" },
    { id: "30days", label: "30 ngày qua" },
    { id: "thisMonth", label: "Tháng này" },
    { id: "lastMonth", label: "Tháng trước" },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 px-3.5 w-full sm:w-auto rounded-lg border text-xs font-semibold flex items-center justify-between sm:justify-start gap-2.5 transition-all select-none shadow-sm cursor-pointer ${isOpen
            ? "border-[var(--primary)] bg-[var(--surface)] text-[var(--primary)] ring-2 ring-blue-100 dark:ring-blue-900/30"
            : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-soft)] hover:border-[var(--primary)] hover:bg-[var(--hover)]"
          }`}
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span>{getDisplayLabel()}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      {/* Popover content */}
      <div 
        className={`absolute right-0 top-full mt-2 z-50 flex flex-col md:flex-row bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden p-1.5 backdrop-blur-md bg-white/98 dark:bg-[#1A1D26]/98 w-[480px] max-w-[95vw] transition-all duration-200 origin-top-right ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-[-8px] scale-95 pointer-events-none"
        }`}
      >

        {/* Quick presets (Sidebar in Popover) */}
        <div className="flex flex-row md:flex-col gap-0.5 border-b md:border-b-0 md:border-r border-[var(--border)] p-1.5 md:w-36 shrink-0 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset.id)}
              className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap w-full cursor-pointer ${localPeriod === preset.id
                  ? "bg-[var(--primary-soft)] text-[var(--primary)] font-semibold"
                  : "text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                }`}
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
                type="button"
                onClick={prevMonth}
                className="p-1 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] text-[var(--foreground-soft)] transition cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded-lg border border-[var(--border)] hover:bg-[var(--hover)] text-[var(--foreground-soft)] transition cursor-pointer"
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
          <div className="grid grid-cols-7 gap-y-1 justify-items-center text-center">
            {renderDays()}
          </div>

          {/* Actions Footer */}
          <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
            <div className="text-[10px] font-medium text-[var(--muted)] truncate max-w-[130px]">
              {localPeriod === "custom" ? (
                <>
                  {tempStart && (
                    <span className="font-mono text-[var(--foreground-soft)] font-semibold">
                      {tempStart.getDate()}/{tempStart.getMonth() + 1}
                    </span>
                  )}
                  {tempStart && tempEnd && (
                    <>
                      <span className="mx-1">đến</span>
                      <span className="font-mono text-[var(--foreground-soft)] font-semibold">
                        {tempEnd.getDate()}/{tempEnd.getMonth() + 1}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="font-medium text-[var(--foreground-soft)]">
                  {getDisplayLabel().replace("Lịch: ", "")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-7.5 px-2.5 rounded-lg border border-[var(--border)] bg-transparent text-[11px] font-semibold text-[var(--foreground-soft)] hover:bg-[var(--hover)] transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={localPeriod !== "custom" || !tempStart || !tempEnd}
                className="h-7.5 px-2.5 rounded-lg bg-[var(--primary)] text-white text-[11px] font-semibold hover:bg-[var(--primary-strong)] disabled:opacity-50 disabled:pointer-events-none transition flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Check className="h-3 w-3" />
                Áp dụng
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
