"use client";

import React, { useState } from "react";
import { ShoppingBag, Truck, User, Phone, Check, X, Printer, Trash2 } from "lucide-react";
import { formatCurrency, formatDateTime, pickString, pickNumber, extractCollection, asRecord } from "@/lib/proxy-client";
import { OrderStatusDropdown } from "./order-status-dropdown";
import { useUpdateOrder, useDeleteOrder } from "@/hooks/use-orders";

interface OrderDetailModalProps {
  order: Record<string, unknown>;
  onClose: () => void;
  onOpenDelivery: () => void;
  onPrint: () => void;
  isPrinting?: boolean;
}

export function OrderDetailModal({ order, onClose, onOpenDelivery, onPrint, isPrinting }: OrderDetailModalProps) {
  const orderId = pickString(order, ["id", "_id", "orderCode"]) || "";
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();

  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [depositValue, setDepositValue] = useState(String(pickNumber(order, ["deposit"]) ?? 0));

  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(pickString(order, ["phone"]) || "");

  const handleSaveDeposit = async () => {
    try {
      await updateOrder.mutateAsync({ orderId, data: { deposit: Number(depositValue) } });
      setIsEditingDeposit(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePhone = async () => {
    try {
      await updateOrder.mutateAsync({ orderId, data: { phone: phoneValue } });
      setIsEditingPhone(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác.")) {
      try {
        await deleteOrder.mutateAsync(orderId);
        onClose();
      } catch (e) {
        console.error(e);
        alert("Xóa thất bại!");
      }
    }
  };

  const customerInfo = asRecord(order.customerId);
  const customerName = pickString(customerInfo, ["igName", "fullName", "fbName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng";

  const addressData = asRecord(order.shippingAddress || order);
  const addressParts = [
    pickString(addressData, ["street", "address", "detailAddress"]),
    pickString(addressData, ["ward", "wardName"]),
    pickString(addressData, ["district", "districtName"]),
    pickString(addressData, ["province", "provinceName"])
  ].filter(Boolean);
  const addressString = addressParts.length > 0 ? addressParts.join(", ") : "Chưa cập nhật địa chỉ";

  const rawComments = (order.commentIds || order.comments || []) as unknown[];
  let products = Array.isArray(rawComments)
    ? rawComments
        .map((c) => asRecord(c))
        .filter((c) => Object.keys(c).length > 0)
        .filter((c) => pickString(c, ["status"]) !== "BACKUP")
        .map((c, index) => ({
          name: pickString(c, ["text", "content"]) || `Sản phẩm ${index + 1}`,
          sku: pickString(c, ["sku", "productSku", "code"]),
          price: pickNumber(c, ["price"]) ?? 0,
          quantity: pickNumber(c, ["quantity"]) ?? 1,
        }))
    : [];

  if (products.length === 0) {
    products = extractCollection(order.items).map((item) => ({
      name: pickString(item, ["productName", "name", "title"]) || "Sản phẩm không tên",
      sku: pickString(item, ["sku", "code"]),
      price: pickNumber(item, ["price"]) ?? 0,
      quantity: pickNumber(item, ["quantity", "count"]) ?? 1,
    }));
  }

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/30 p-4">
      <div className="absolute inset-0 z-0" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col bg-[var(--surface)] shadow-xl rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h4 className="text-lg font-semibold text-[var(--foreground)]">Chi tiết đơn hàng</h4>
                <OrderStatusDropdown currentStatus={pickString(order, ["status"])} orderId={orderId} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs bg-[var(--primary-soft)] text-[var(--primary)] px-2 py-0.5 rounded font-medium">
                  #{pickString(order, ["orderCode", "code"]) || orderId.substring(0, 8)}
                </span>
                <span className="text-xs text-[var(--muted)] font-medium">• {formatDateTime(pickString(order, ["createdAt", "updatedAt"]))}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button
              onClick={handleDelete}
              disabled={deleteOrder.isPending}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Xóa đơn hàng"
             >
               <Trash2 className="h-5 w-5" />
             </button>
             <button
               onClick={onClose}
               className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] transition-colors"
             >
               <X className="h-6 w-6" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Số tiền cần thu</p>
              <h3 className="text-lg font-bold text-[var(--primary)]">
                {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
              </h3>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 flex flex-col justify-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Tiền cọc</p>
              {isEditingDeposit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    className="w-full h-8 px-2 text-sm border border-[var(--border)] rounded bg-[var(--surface)]"
                    autoFocus
                  />
                  <button onClick={handleSaveDeposit} disabled={updateOrder.isPending} className="p-1 text-green-600 bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setIsEditingDeposit(false)} disabled={updateOrder.isPending} className="p-1 text-red-600 bg-red-50 rounded"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <h3 
                  className="text-lg font-bold text-[#16a34a] cursor-pointer hover:underline decoration-dashed underline-offset-4"
                  onClick={() => setIsEditingDeposit(true)}
                  title="Nhấn để sửa tiền cọc"
                >
                  {formatCurrency(pickNumber(order, ["deposit"]) ?? 0)}
                </h3>
              )}
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
              <User className="w-3.5 h-3.5" /> Thông tin khách hàng
            </h5>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
              <div className="p-3 flex justify-between items-center">
                <span className="text-xs font-medium text-[var(--muted)]">Khách hàng</span>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-xs relative">
                    {pickString(customerInfo, ["avatar"]) ? (
                      <>
                        <img 
                          src={pickString(customerInfo, ["avatar"])!} 
                          alt="Avatar" 
                          className="h-full w-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                          }} 
                        />
                        <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                          {customerName.charAt(0).toUpperCase()}
                        </div>
                      </>
                    ) : (
                      <span className="font-bold uppercase">
                        {customerName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-[var(--foreground)]">{customerName}</span>
                </div>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-xs font-medium text-[var(--muted)]">Điện thoại</span>
                {isEditingPhone ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      className="w-32 h-7 px-2 text-xs border border-[var(--border)] rounded bg-[var(--surface)]"
                      autoFocus
                    />
                    <button onClick={handleSavePhone} disabled={updateOrder.isPending} className="p-1 text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setIsEditingPhone(false)} disabled={updateOrder.isPending} className="p-1 text-red-600"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <span 
                    className="text-xs font-semibold text-[var(--primary)] cursor-pointer hover:underline decoration-dashed"
                    onClick={() => setIsEditingPhone(true)}
                  >
                    {pickString(order, ["phone"]) || "Chưa cập nhật"}
                  </span>
                )}
              </div>
              <div className="p-3">
                <span className="text-xs font-medium text-[var(--muted)] block mb-1">Địa chỉ giao hàng</span>
                <span className="text-xs font-medium text-[var(--foreground)] leading-relaxed">
                  {addressString}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items Section */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
              <ShoppingBag className="w-3.5 h-3.5" /> Sản phẩm trong đơn ({products.length})
            </h5>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-muted)] text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Mặt hàng</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-center text-[11px]">SL</th>
                    <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-right text-[11px]">Giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.length > 0 ? (
                    products.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--hover)] transition-colors">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-[var(--foreground)] text-xs">{item.name}</p>
                          <p className="text-[10px] text-[var(--muted)]">#{item.sku || "NO-SKU"}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-xs">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-[var(--foreground)] text-xs">{formatCurrency(item.price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)] italic">Không tìm thấy thông tin sản phẩm chi tiết</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="font-semibold border-t border-[var(--border)]">
                  <tr>
                    <td colSpan={2} className="px-4 py-2.5 text-right text-[var(--muted)] uppercase tracking-wider text-xs">Tổng cộng</td>
                    <td className="px-4 py-2.5 text-right text-[var(--primary)] text-xs">{formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-3 pb-4">
            <h5 className="text-[10px] font-medium uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
              <Truck className="w-3.5 h-3.5" /> Ghi chú & Vận chuyển
            </h5>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3">
              <div>
                <p className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Ghi chú đơn hàng</p>
                <p className="text-xs font-medium text-[var(--foreground)] italic">
                  {pickString(order, ["note", "customerNote"]) || "Không có ghi chú nào cho đơn hàng này."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border)] shrink-0 grid grid-cols-2 gap-3">
          <button
            onClick={onOpenDelivery}
            className="h-11 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
          >
            <Truck className="w-4 h-4" />
            GIAO HÀNG
          </button>
          <button
            onClick={onPrint}
            disabled={isPrinting}
            className="h-11 rounded-lg bg-[var(--accent-green)] hover:bg-[var(--accent-green-strong)] text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? "ĐANG IN..." : "IN VẬN ĐƠN"}
          </button>
        </div>
      </div>
    </div>
  );
}
