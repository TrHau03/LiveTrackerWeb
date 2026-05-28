"use client";

import React from "react";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "../ui/workspace-shared";

interface BridgeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry?: () => void;
}

export function BridgeSetupModal({ isOpen, onClose, onRetry }: BridgeSetupModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Dialog Body */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                Không Tìm Thấy Local Bridge!
              </h3>
              <p className="text-xs text-[var(--muted)]">
                Yêu cầu cài đặt hoặc khởi chạy ứng dụng hỗ trợ in ấn.
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="text-sm text-[var(--foreground)] leading-relaxed space-y-3">
            <p>
              Tính năng in nhiệt trực tiếp qua cổng <strong>USB</strong> hoặc <strong>LAN (TCP/IP)</strong> đòi hỏi chương trình chạy ngầm <strong>LiveTracker Local Bridge</strong> phải đang chạy trên máy tính của bạn.
            </p>
            <div className="bg-[var(--surface-muted)]/50 rounded-xl p-3 border border-[var(--border)] text-xs text-[var(--muted)] space-y-1">
              <div className="font-semibold text-[var(--foreground)] mb-1">💡 Ưu điểm của Local Bridge:</div>
              <div>• Siêu gọn nhẹ (RAM &lt; 15MB, khởi động tức thì).</div>
              <div>• In thô trực tiếp xuống máy in nhiệt siêu nhanh, không cần hiện hộp thoại in của trình duyệt.</div>
              <div>• Tự động khởi chạy cùng Windows và macOS (Auto-startup).</div>
              <div>• Tự cập nhật phiên bản mới ngầm, bảo mật.</div>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              Hướng dẫn nhanh:
            </h4>
            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">1</span>
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Tải ứng dụng</span> cho máy tính của bạn bên dưới.
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">2</span>
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Giải nén và mở ứng dụng</span> (LiveTrackerBridge). Trình duyệt sẽ tự nhận dạng.
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-white">3</span>
                <div>
                  <span className="font-semibold text-[var(--foreground)]">Cấu hình máy in</span> ngay trên trang cài đặt web và bắt đầu in chốt đơn siêu tốc!
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between items-center border-t border-[var(--border)] pt-4 mt-2">
            {/* Download Links */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-start">
              <a
                href="/downloads/LiveTrackerBridge-Windows.zip"
                download
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs font-medium shadow-sm transition"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.45H0V3.45zm0 17.1L9.75 21.9v-9.45H0v9.1zm11.25 1.65L24 24v-11.55H11.25v9.8zM11.25 0v9.9H24V0L11.25 2.2z" />
                </svg>
                Tải cho Windows (.zip)
              </a>
              <a
                href="/downloads/LiveTrackerBridge-macOS.zip"
                download
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white px-3 text-xs font-medium shadow-sm transition border border-zinc-700"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.62.71-1.16 1.85-1.01 2.96 1.12.09 2.26-.56 2.94-1.39z" />
                </svg>
                Tải cho macOS (.zip)
              </a>
            </div>

            {/* Dialog Operations */}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className={`${SECONDARY_BUTTON_CLASS} h-9 px-4 text-xs`}
              >
                Đóng
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`${PRIMARY_BUTTON_CLASS} h-9 px-4 text-xs`}
                >
                  Đã mở (Thử lại)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
