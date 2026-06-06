"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePrintSettings } from "@/hooks/use-print-settings";
import { updatePrintTemplate } from "@/lib/services/print-settings-service";
import { useSession } from "@/components/session-provider";
import { OrderReceipt } from "./OrderReceipt";
import { CommentReceipt } from "./CommentReceipt";
import { RECEIPT_CSS } from "@/lib/utils/print-utils";
import type { PrintContentSettings } from "@/types";

export function PrintSettingsPanel() {
  const { session } = useSession();
  const { getPrintSettings, invalidateCache } = usePrintSettings();
  const [activeTab, setActiveTab] = useState<"order" | "comment">("order");
  
  const [orderSettings, setOrderSettings] = useState<PrintContentSettings | null>(null);
  const [commentSettings, setCommentSettings] = useState<PrintContentSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    async function load() {
      const oSettings = await getPrintSettings("order");
      const cSettings = await getPrintSettings("comment");
      setOrderSettings(oSettings);
      setCommentSettings(cSettings);
    }
    load();
  }, [getPrintSettings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };



  const handleSave = async () => {
    if (!orderSettings || !commentSettings || !session.accessToken) return;
    setIsSaving(true);
    try {
      await updatePrintTemplate(session, {
        orderTemplate: {
          shopInfo: {
            name: orderSettings.storeInfo.name,
            address: orderSettings.storeInfo.address,
            phone: orderSettings.storeInfo.phone,
          },
          customerInfo: {
            address: orderSettings.customerInfo.address,
            phone: orderSettings.customerInfo.phone,
          },
          productInfo: {
            productList: orderSettings.productInfo.productList,
            totalAmount: orderSettings.productInfo.totalAmount,
          },
        },
        commentTemplate: {
          shopInfo: {
            name: commentSettings.storeInfo.name,
            address: commentSettings.storeInfo.address,
            phone: commentSettings.storeInfo.phone,
          },
          productInfo: {
            product: commentSettings.productInfo.product,
            quantity: commentSettings.productInfo.quantity,
            price: commentSettings.productInfo.price,
          },
        },
      });
      invalidateCache();
      showToast("Lưu cấu hình thành công");
    } catch {
      showToast("Lỗi khi lưu cấu hình");
    } finally {
      setIsSaving(false);
    }
  };

  if (!orderSettings || !commentSettings) {
    return <div className="p-5 text-sm text-[var(--muted)]">Đang tải cấu hình máy in...</div>;
  }

  const currentSettings = activeTab === "order" ? orderSettings : commentSettings;
  const setSettings = activeTab === "order" ? setOrderSettings : setCommentSettings;

  const handleToggle = (group: keyof PrintContentSettings, field: string) => {
    setSettings({
      ...currentSettings,
      [group]: {
        ...(currentSettings[group] as any),
        [field]: !(currentSettings[group] as any)[field],
      },
    });
  };

  // MOCK DATA FOR PREVIEW
  const mockShopInfo = { name: "MINI SHOP", address: "123 Đường ABC, Quận 1, TP.HCM", phone: "0901234567" };
  const mockOrder = {
    orderCode: "KLD92A",
    customerName: "Nguyễn Văn A",
    phone: "0987654321",
    street: "Số 10",
    ward: "Phường Nghĩa Đô",
    province: "Cầu Giấy, Hà Nội",
    totalQuantity: 2,
    totalPrice: 450000,
    deposit: 50000,
    depositStatus: "PAID",
    remainingTotal: 400000,
    createdAt: new Date().toISOString(),
    comments: [
      { text: "Áo polo size M", price: 200000, quantity: 1, status: "NORMAL" },
      { text: "Quần âu size 30", price: 250000, quantity: 1, status: "NORMAL" }
    ]
  };
  const mockComment = {
    igUsername: "nguyenvana",
    text: "Áo polo size M",
    price: 200000,
    quantity: 1,
    createdAt: new Date().toISOString()
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-5">
      {/* ── SETTINGS CONTROLS ── */}
      <div className="flex-1 space-y-6">
        <div className="flex rounded-lg bg-[var(--surface-muted)] p-1 w-full max-w-sm">
          <button
            onClick={() => setActiveTab("order")}
            className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${activeTab === "order" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}
          >
            In Đơn hàng
          </button>
          <button
            onClick={() => setActiveTab("comment")}
            className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${activeTab === "comment" ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"}`}
          >
            In Bình luận
          </button>
        </div>

        <div className="space-y-4">
          <ControlGroup title="Thông tin cửa hàng">
            <Toggle label="Tên cửa hàng" checked={currentSettings.storeInfo.name} onChange={() => handleToggle("storeInfo", "name")} />
            <Toggle label="Địa chỉ" checked={currentSettings.storeInfo.address} onChange={() => handleToggle("storeInfo", "address")} />
            <Toggle label="Số điện thoại" checked={currentSettings.storeInfo.phone} onChange={() => handleToggle("storeInfo", "phone")} />
          </ControlGroup>

          {activeTab === "order" && (
            <ControlGroup title="Thông tin khách hàng">
              <Toggle label="Số điện thoại" checked={currentSettings.customerInfo.phone} onChange={() => handleToggle("customerInfo", "phone")} />
              <Toggle label="Địa chỉ giao hàng" checked={currentSettings.customerInfo.address} onChange={() => handleToggle("customerInfo", "address")} />
            </ControlGroup>
          )}

          <ControlGroup title="Thông tin sản phẩm">
            {activeTab === "order" ? (
              <>
                <Toggle label="Danh sách sản phẩm" checked={currentSettings.productInfo.productList} onChange={() => handleToggle("productInfo", "productList")} />
                <Toggle label="Tổng tiền & Cọc" checked={currentSettings.productInfo.totalAmount} onChange={() => handleToggle("productInfo", "totalAmount")} />
              </>
            ) : (
              <>
                <Toggle label="Tên sản phẩm (Comment)" checked={currentSettings.productInfo.product} onChange={() => handleToggle("productInfo", "product")} />
                <Toggle label="Số lượng" checked={currentSettings.productInfo.quantity} onChange={() => handleToggle("productInfo", "quantity")} />
                <Toggle label="Giá tiền" checked={currentSettings.productInfo.price} onChange={() => handleToggle("productInfo", "price")} />
              </>
            )}
          </ControlGroup>
        </div>

        <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] disabled:opacity-50"
          >
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
          
          {toastMessage && (
            <span className="text-sm font-semibold text-green-600 animate-in fade-in">{toastMessage}</span>
          )}
        </div>
      </div>

      {/* ── LIVE PREVIEW ── */}
      <div className="w-full lg:w-[400px] h-[540px] flex-shrink-0 relative flex flex-col rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-muted)] shadow-[var(--shadow-soft)]">
        <div className="bg-[var(--surface)] text-[var(--foreground)] text-xs font-bold px-4 py-3 uppercase tracking-widest text-center border-b border-[var(--border)] flex items-center justify-center gap-2">
          <svg className="h-3.5 w-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          Bản in xem trước (80mm)
        </div>
        
        {/* Magic scale wrapper to fit 576px thermal receipt into 400px panel */}
        <div className="relative flex-1 bg-gradient-to-tr from-[var(--surface-muted)] to-[var(--surface)] flex items-start justify-center overflow-y-auto p-6 custom-scrollbar-premium min-h-[480px]">
           <style dangerouslySetInnerHTML={{ __html: RECEIPT_CSS }} />
           <div style={{ transform: "scale(0.68)", transformOrigin: "top center", paddingBottom: "100px" }} className="transition-all duration-300">
             <div className="relative flex flex-col bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-[2px] select-none">
               {/* Ambient side highlights to give paper thickness */}
               <div className="absolute inset-y-0 -left-[1px] w-[1px] bg-slate-200/50 dark:bg-white/10" />
               <div className="absolute inset-y-0 -right-[1px] w-[1px] bg-slate-200/50 dark:bg-white/10" />
               
               {/* Top Zigzag paper edge */}
               <div className="w-full h-[6px] shrink-0 fill-white" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 10' width='20' height='10' preserveAspectRatio='none'%3E%3Cpolygon points='0,10 10,0 20,10' fill='%23ffffff'/%3E%3C/svg%3E\")", backgroundSize: "12px 6px", backgroundRepeat: "repeat-x" }} />
               
               {/* Main receipt body */}
               <div className="bg-white px-2">
                 {activeTab === "order" ? (
                   <OrderReceipt order={mockOrder} settings={currentSettings} shopInfo={mockShopInfo} />
                 ) : (
                   <CommentReceipt comment={mockComment} settings={currentSettings} shopInfo={mockShopInfo} />
                 )}
               </div>
               
               {/* Bottom Zigzag paper edge */}
               <div className="w-full h-[6px] shrink-0 fill-white rotate-180" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 10' width='20' height='10' preserveAspectRatio='none'%3E%3Cpolygon points='0,10 10,0 20,10' fill='%23ffffff'/%3E%3C/svg%3E\")", backgroundSize: "12px 6px", backgroundRepeat: "repeat-x" }} />
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ControlGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-[var(--foreground)] mt-2">{title}</h3>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subdued)] p-1 flex flex-col gap-1">
        {children}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-3 hover:bg-[var(--surface-muted)] rounded-md transition-colors">
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
      <div className="relative flex h-6 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ease-in-out" style={{ backgroundColor: checked ? 'var(--primary)' : 'var(--border)' }}>
        <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
      </div>
    </label>
  );
}
