"use client";

import { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSession } from "@/components/session-provider";

export function SettingsScreen() {
  const { session } = useSession();
  const { 
    theme, language, autoReconnectSSE, paperSize, commentDisplayOrder, 
    setTheme, setLanguage, setAutoReconnectSSE, setPaperSize, setCommentDisplayOrder 
  } = useSettingsStore();

  const [printerConfig, setPrinterConfig] = useState({
    enabled: true,
    autoPrint: true,
  });

  return (
    <div className="space-y-6 pb-28 lg:pb-6 max-w-4xl">
      <section className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
          Cài đặt hệ thống
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Quản lý tài khoản, cấu hình phần cứng và giao diện.
        </p>
      </section>

      <div className="grid gap-6">
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Cài đặt giao diện & Hệ thống</h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-[var(--foreground)]">Giao diện (Theme)</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Tuỳ chỉnh màu sắc hiển thị của Dashboard.</p>
              </div>
              <div className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-1 w-fit">
                <button 
                  onClick={() => setTheme("light")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${theme === "light" ? "bg-[var(--surface)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >Sáng</button>
                <button 
                  onClick={() => setTheme("dark")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${theme === "dark" ? "bg-[var(--surface)] shadow-sm text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >Tối</button>
              </div>
            </div>

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-[var(--foreground)]">Ngôn ngữ</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Ngôn ngữ hiển thị chính.</p>
              </div>
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] w-full sm:w-40"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-[var(--foreground)]">Tự động kết nối lại Livestream (SSE)</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Hệ thống sẽ tự cố gắng kết nối lại nếu bị mạng yếu mất stream comment.</p>
              </div>
               <label className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" style={{ backgroundColor: autoReconnectSSE ? 'var(--primary)' : 'var(--surface-muted)' }}>
                  <input type="checkbox" checked={autoReconnectSSE} onChange={(e) => setAutoReconnectSSE(e.target.checked)} className="peer sr-only" />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReconnectSSE ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                </label>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Máy in nhiệt</h2>
          </div>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--foreground)]">Kích hoạt in nhãn/vận đơn</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Cho phép in trực tiếp từ trình duyệt khi chốt đơn.</p>
              </div>
               <label className="relative flex h-6 w-11 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" style={{ backgroundColor: printerConfig.enabled ? 'var(--primary)' : 'var(--surface-muted)' }}>
                  <input type="checkbox" checked={printerConfig.enabled} onChange={(e) => setPrinterConfig({...printerConfig, enabled: e.target.checked})} className="peer sr-only" />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${printerConfig.enabled ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                </label>
            </div>

            {printerConfig.enabled && (
               <>
                 <div className="h-px w-full bg-[var(--border)]" />
                 
                 <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-[var(--foreground)]">Khổ giấy in</h3>
                      <p className="text-sm text-[var(--muted)] mt-1">Phù hợp nhất với khổ giấy 80mm.</p>
                    </div>
                    <select 
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as "80mm" | "58mm" | "a5")}
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
                    >
                      <option value="80mm">K80 (80mm)</option>
                      <option value="58mm">K58 (58mm)</option>
                      <option value="a5">A5</option>
                    </select>
                  </div>
               </>
            )}
          </div>
        </section>
        
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <div className="border-b border-[var(--border)] px-5 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Tài khoản & Phân quyền</h2>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4">
               <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-bold text-white shadow-sm ring-4 ring-white/10">
                  {session.user?.fullName?.[0]?.toUpperCase() || "A"}
               </div>
               <div>
                  <p className="text-lg font-bold text-[var(--foreground)]">{session.user?.fullName || "Admin"}</p>
                  <p className="text-sm font-medium mt-0.5 text-[var(--muted)]">{session.user?.email || "admin@example.com"}</p>
                  <span className="inline-block mt-2 rounded bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)]">Hệ thống</span>
               </div>
            </div>
            
            <div className="mt-8 border-t border-[var(--border)] pt-5">
               <button className="rounded-lg bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition-colors">
                  Đăng xuất khỏi thiết bị này
               </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
