import React from "react";
import { getOrderStatusColors, getOrderStatusLabel } from "@/lib/utils/order-status";

interface OrderStatusBadgeProps {
  status?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function OrderStatusBadge({ status, size = "sm", className }: OrderStatusBadgeProps) {
  const colors = getOrderStatusColors(status);
  const label = getOrderStatusLabel(status);

  return (
    <span 
      className={`relative inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${colors.bg} ${colors.border} ${colors.text} ${size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"} ${className || ""}`}
    >
      <span className={`flex rounded-full ${colors.dot} ${size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"} ${colors.animate ? "animate-pulse" : ""}`}></span>
      {label}
    </span>
  );
}
