"use client";

import React, { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSession } from "@/components/session-provider";
import { useHeaderStore } from "@/lib/store/header-store";
import { PrintSettingsPanel } from "@/components/print/PrintSettingsPanel";
import { Panel, CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { Globe, Tv, Printer, LogOut, CheckCircle, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { useInstagramOAuth } from "@/hooks/use-instagram-oauth";
import { deleteShopFromBackend } from "@/lib/instagram-auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";

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

          {/* Panel kết nối Instagram */}
          <InstagramConnectPanel />

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

// ─── Instagram Connect Panel ───────────────────────────────────────────────

function InstagramConnectPanel() {
  const { session, logout, patchSession } = useSession();
  const {
    startInstagramAuth,
    isLoading,
    error,
    notice,
  } = useInstagramOAuth({ session, patchSession, logout });

  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shopIdToDelete, setShopIdToDelete] = useState<string | null>(null);

  const shops = session.user?.shops ?? [];
  const isConnected = shops.length > 0;

  function handleDeleteShop(shopId: string) {
    setShopIdToDelete(shopId);
    setIsConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!shopIdToDelete || deletingShopId) return;
    setIsConfirmOpen(false);

    const shopId = shopIdToDelete;
    setShopIdToDelete(null);
    setDeletingShopId(shopId);

    try {
      const res = await deleteShopFromBackend(session, shopId);
      if (res.ok) {
        const updatedShops = shops.filter((s) => s.id !== shopId);
        if (session.user) {
          patchSession({
            user: {
              ...session.user,
              shops: updatedShops,
            },
          });
        }
      } else {
        alert("Không thể xóa cửa hàng. Vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error("Delete shop error:", err);
      alert("Đã xảy ra lỗi khi xóa cửa hàng.");
    } finally {
      setDeletingShopId(null);
    }
  }

  function onCancelDelete() {
    setIsConfirmOpen(false);
    setShopIdToDelete(null);
  }

  return (
    <Panel title="Instagram">
      <div className="space-y-4">
        {/* Danh sách các shop đã kết nối */}
        {isConnected ? (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
              Cửa hàng đã kết nối ({shops.length})
            </p>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {shops.map((shop) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div 
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 shadow-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 text-sm font-bold text-white shadow-sm shrink-0">
                        {shop.avatar ? (
                          <img src={shop.avatar} alt={shop.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          shop.name[0]?.toUpperCase() || "S"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{shop.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 shrink-0">
                            Instagram
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] truncate">ID: {shop.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteShop(shop.id)}
                        disabled={deletingShopId !== null}
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition disabled:opacity-50 shrink-0"
                        title="Xóa cửa hàng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
            <InstagramIcon className="mx-auto h-8 w-8 text-[var(--muted)] opacity-50" />
            <p className="mt-2 text-xs text-[var(--foreground-soft)]">Chưa có tài khoản Instagram nào được kết nối.</p>
          </div>
        )}

        {/* Feedback */}
        {notice && (
          <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground-soft)]">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            id="instagram-auth-btn"
            type="button"
            onClick={() => void startInstagramAuth()}
            disabled={isLoading}
            className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              boxShadow: "0 4px 12px rgba(220,39,67,0.2)",
            }}
          >
            <InstagramIcon className="h-4 w-4" color="white" />
            {isLoading
              ? "Đang xác thực..."
              : isConnected
                ? "Kết nối thêm tài khoản"
                : "Kết nối Instagram"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Xác nhận xóa cửa hàng"
        message="Bạn có chắc chắn muốn xóa cửa hàng này khỏi tài khoản của bạn không? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isDanger={true}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </Panel>
  );
}

// Instagram icon SVG (not available in lucide-react)
function InstagramIcon({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
