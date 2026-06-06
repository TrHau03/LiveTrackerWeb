"use client";

import React, { useState } from "react";
import { useSession } from "@/components/session-provider";
import { useInstagramOAuth } from "@/hooks/use-instagram-oauth";
import { deleteShopFromBackend } from "@/lib/instagram-auth";
import { Panel } from "@/components/ui/workspace-shared";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ShopSettingsDialog } from "@/components/features/settings/shop-settings-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Trash2 } from "lucide-react";

// Instagram icon SVG (not available in lucide-react)
export function InstagramIcon({ className, color = "currentColor" }: { className?: string; color?: string }) {
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

export function InstagramConnectPanel() {
  const { session, logout, patchSession, refreshUser } = useSession();
  const {
    startInstagramAuth,
    isLoading,
    error,
    notice,
  } = useInstagramOAuth({ session, patchSession, logout });

  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shopIdToDelete, setShopIdToDelete] = useState<string | null>(null);
  const [editingShop, setEditingShop] = useState<any | null>(null);

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
        {/* Connected shops list */}
        {isConnected ? (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
              Cửa hàng đã kết nối ({shops.length})
            </p>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {shops.map((shop: any) => (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{shop.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 shrink-0">
                            Instagram
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-[var(--muted)]">
                          <span>ID: {shop.id}</span>
                          {shop.phone && <span>• SĐT: {shop.phone}</span>}
                          {shop.address && <span className="truncate max-w-[150px]">• Địa chỉ: {shop.address}</span>}
                          {shop.bankCode && <span className="text-[var(--primary)] font-medium bg-[var(--primary-soft)] px-1 rounded flex items-center gap-0.5">💳 VietQR</span>}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setEditingShop(shop)}
                        disabled={deletingShopId !== null}
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition disabled:opacity-50 shrink-0"
                        title="Cấu hình Shop"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

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

      {editingShop && (
        <ShopSettingsDialog
          isOpen={editingShop !== null}
          onClose={() => setEditingShop(null)}
          shop={editingShop}
          onSuccess={async () => {
            await refreshUser();
          }}
        />
      )}
    </Panel>
  );
}
