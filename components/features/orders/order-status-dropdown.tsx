"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel, getOrderStatusColors } from "@/lib/utils/order-status";
import { useUpdateOrderStatus } from "@/hooks/use-orders";

interface OrderStatusDropdownProps {
  currentStatus?: string | null;
  orderId: string;
  onStatusChanged?: () => void;
}

export function OrderStatusDropdown({ currentStatus, orderId, onStatusChanged }: OrderStatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const updateStatus = useUpdateOrderStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) {
      setIsOpen(false);
      return;
    }

    try {
      await updateStatus.mutateAsync({ orderId, status: newStatus });
      setIsOpen(false);
      if (onStatusChanged) {
        onStatusChanged();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentColors = getOrderStatusColors(currentStatus);
  const currentLabel = getOrderStatusLabel(currentStatus);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={updateStatus.isPending}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors ${currentColors.bg} ${currentColors.border} ${currentColors.text} ${updateStatus.isPending ? "opacity-50 cursor-not-allowed" : "hover:brightness-95"}`}
      >
        <span className={`flex h-2 w-2 rounded-full ${currentColors.dot} ${currentColors.animate ? "animate-pulse" : ""}`}></span>
        {updateStatus.isPending ? "Đang cập nhật..." : currentLabel}
        <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {ORDER_STATUS_OPTIONS.map((status) => {
            const colors = getOrderStatusColors(status);
            const label = getOrderStatusLabel(status);
            const isSelected = status === currentStatus;

            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center justify-between hover:bg-[var(--hover)] transition-colors ${isSelected ? "bg-[var(--hover)]" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`flex h-2 w-2 rounded-full ${colors.dot}`}></span>
                  <span className={colors.text}>{label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[var(--primary)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
