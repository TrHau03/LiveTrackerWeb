"use client";

import React, { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSession } from "@/components/session-provider";
import { useHeaderStore } from "@/lib/store/header-store";
import { PrintSettingsPanel } from "@/components/print/PrintSettingsPanel";
import { Panel, CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { Globe, Tv, Printer, LogOut } from "lucide-react";

export function SettingsScreen() {
  const { session } = useSession();
  const { 
    language, autoReconnectSSE, paperSize, 
    setLanguage, setAutoReconnectSSE, setPaperSize 
  } = useSettingsStore();

  const setHeader = useHeaderStore(state => state.setHeader);
  const resetHeader = useHeaderStore(state => state.resetHeader);

  React.useEffect(() => {
    setHeader({
      title: "Cài đặt hệ thống",
      subtitle: "Quản lý tài khoản, cấu hình máy in và thiết lập chung",
      showDateRange: false,
      actions: []
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const [printerConfig, setPrinterConfig] = useState({
    enabled: true,
    autoPrint: true,
  });

  return (
    <div className="space-y-4 pb-28 lg:pb-6 pt-0 w-full">
      <div className="grid gap-3.5 lg:grid-cols-12 items-start">
        
        {/* Cột trái: Cài đặt hệ thống & Tài khoản (col-span-5) */}
        <div className="lg:col-span-5 space-y-3.5">
          
          <Panel title="Cài đặt hệ thống">
            <div className="space-y-5">
              {/* Ngôn ngữ */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--foreground)] text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[var(--primary)]" />
                    Ngôn ngữ hiển thị
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Ngôn ngữ hiển thị chính trên toàn bộ Dashboard.</p>
                </div>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                  className={`${CONTROL_CLASS} w-full sm:w-36`}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="h-px w-full bg-[var(--border)]" />

              {/* Tự động kết nối lại SSE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--foreground)] text-sm flex items-center gap-2">
                    <Tv className="w-4 h-4 text-[var(--primary)]" />
                    Tự động kết nối lại (SSE)
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Tự động kết nối lại livestream khi phát hiện đường truyền yếu.</p>
                </div>
                <label className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" style={{ backgroundColor: autoReconnectSSE ? 'var(--primary)' : 'var(--surface-muted)' }}>
                  <input type="checkbox" checked={autoReconnectSSE} onChange={(e) => setAutoReconnectSSE(e.target.checked)} className="peer sr-only" />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReconnectSSE ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                </label>
              </div>
            </div>
          </Panel>

          <Panel title="Tài khoản & Phân quyền">
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-muted)] p-4 shadow-[var(--shadow-soft)]">
                <div className="absolute right-0 top-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-[var(--primary)] opacity-5 blur-2xl" />
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-blue-500 text-xl font-bold text-white shadow-md ring-4 ring-white/10 shrink-0">
                    {session.user?.fullName?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-[var(--foreground)]">{session.user?.fullName || "Admin"}</p>
                    <p className="truncate text-xs font-medium text-[var(--muted)] mt-0.5">{session.user?.email || "admin@example.com"}</p>
                    <span className="inline-flex mt-2 items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] dark:bg-blue-950/30 dark:text-blue-400">
                      Hệ thống
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-1">
                <button 
                  onClick={() => {
                    import("@/components/session-provider").then(m => {
                      // Get function out of react Context if possible, but for now we just use best effort
                    });
                  }}
                  className={`${SECONDARY_BUTTON_CLASS} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 w-full flex items-center justify-center gap-2`}
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất khỏi thiết bị này
                </button>
              </div>
            </div>
          </Panel>

        </div>

        {/* Cột phải: Máy in nhiệt & Nội dung in (col-span-7) */}
        <div className="lg:col-span-7 space-y-3.5">
          
          <Panel title="Máy in nhiệt">
            <div className="space-y-5">
              {/* Kích hoạt in */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-[var(--foreground)] text-sm flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[var(--primary)]" />
                    Kích hoạt in nhãn / vận đơn
                  </h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Cho phép in trực tiếp từ trình duyệt khi tạo hoặc chốt đơn hàng.</p>
                </div>
                <label className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" style={{ backgroundColor: printerConfig.enabled ? 'var(--primary)' : 'var(--surface-muted)' }}>
                  <input type="checkbox" checked={printerConfig.enabled} onChange={(e) => setPrinterConfig({...printerConfig, enabled: e.target.checked})} className="peer sr-only" />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${printerConfig.enabled ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                </label>
              </div>

              {printerConfig.enabled && (
                <>
                  <div className="h-px w-full bg-[var(--border)]" />
                  
                  {/* Khổ giấy in */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--foreground)] text-sm">Khổ giấy in</h3>
                      <p className="text-xs text-[var(--muted)] mt-0.5">Lựa chọn kích thước giấy của máy in nhiệt đang kết nối.</p>
                    </div>
                    <select 
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value as "80mm" | "58mm" | "a5")}
                      className={`${CONTROL_CLASS} w-full sm:w-44`}
                    >
                      <option value="80mm">K80 (Rộng 80mm)</option>
                      <option value="58mm">K58 (Rộng 58mm)</option>
                      <option value="a5">A5 (Sử dụng mực)</option>
                    </select>
                  </div>

                  <div className="h-px w-full bg-[var(--border)]" />
                  
                  {/* Mẫu in */}
                  <div>
                    <h3 className="font-medium text-[var(--foreground)] text-sm mb-3.5">Nội dung & Thông tin mẫu in</h3>
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] overflow-hidden p-1">
                      <div className="bg-[var(--surface)] rounded-lg p-0.5 border border-[var(--border)]/40 shadow-inner">
                        <PrintSettingsPanel />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Panel>

        </div>

      </div>
    </div>
  );
}
