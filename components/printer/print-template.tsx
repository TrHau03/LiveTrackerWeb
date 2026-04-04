/**
 * Print Template — Layout CSS chuyên dụng cho máy in nhiệt 58mm/80mm.
 * Sử dụng window.print() với @media print để ẩn UI, chỉ hiện bill.
 */
"use client";

import { useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/proxy-client";

type PrintableOrder = {
  orderCode?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  items?: Array<{
    productName?: string;
    quantity?: number;
    price?: number;
  }>;
  totalPrice?: number;
  deposit?: number;
  createdAt?: string;
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
};

export function PrintTemplate({
  order,
  paperSize = "80mm",
  onClose,
}: {
  order: PrintableOrder;
  paperSize?: "80mm" | "58mm" | "a5";
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto print when mounted
    const timeout = setTimeout(() => {
      window.print();
    }, 300);

    const handleAfterPrint = () => {
      onClose();
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [onClose]);

  const remaining = (order.totalPrice ?? 0) - (order.deposit ?? 0);
  const maxWidth = paperSize === "58mm" ? "58mm" : paperSize === "a5" ? "148mm" : "80mm";

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          body > *:not(#print-overlay) {
            display: none !important;
          }
          #print-overlay {
            display: block !important;
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: white;
          }
          @page {
            size: ${maxWidth} auto;
            margin: 2mm;
          }
        }
      `}</style>

      {/* Screen overlay (click to close) */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      >
        <div
          className="relative mx-4 max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
          style={{ width: paperSize === "58mm" ? "320px" : paperSize === "a5" ? "500px" : "360px" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Xem trước bản in</h3>
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
              >
                🖨️ In
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
          <div
            ref={printRef}
            className="border border-dashed border-gray-300 bg-white p-4"
            style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.6" }}
          >
            <BillContent order={order} />
          </div>
        </div>
      </div>

      {/* Print-only content */}
      <div
        id="print-overlay"
        className="hidden"
        style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: "1.6" }}
      >
        <BillContent order={order} />
      </div>
    </>
  );
}

function BillContent({ order }: { order: PrintableOrder }) {
  const remaining = (order.totalPrice ?? 0) - (order.deposit ?? 0);

  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "8px" }}>
        {order.shopName && (
          <div style={{ fontSize: "16px", fontWeight: "bold" }}>{order.shopName}</div>
        )}
        {order.shopPhone && (
          <div style={{ fontSize: "11px" }}>SĐT: {order.shopPhone}</div>
        )}
        {order.shopAddress && (
          <div style={{ fontSize: "11px" }}>{order.shopAddress}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Title */}
      <div style={{ textAlign: "center", fontSize: "15px", fontWeight: "bold", margin: "4px 0" }}>
        HOÁ ĐƠN BÁN HÀNG
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Order Info */}
      <div>
        <div>Mã đơn: <strong>{order.orderCode || "---"}</strong></div>
        <div>Khách: <strong>{order.customerName || "---"}</strong></div>
        {order.phone && <div>SĐT: {order.phone}</div>}
        {order.address && <div>Đ/c: {order.address}</div>}
        {order.createdAt && (
          <div>Ngày: {new Date(order.createdAt).toLocaleString("vi-VN")}</div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={{ textAlign: "left", padding: "2px 0", fontSize: "11px" }}>Sản phẩm</th>
                <th style={{ textAlign: "center", padding: "2px 0", fontSize: "11px", width: "30px" }}>SL</th>
                <th style={{ textAlign: "right", padding: "2px 0", fontSize: "11px" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "2px 0", fontSize: "11px" }}>{item.productName || `SP ${idx + 1}`}</td>
                  <td style={{ textAlign: "center", padding: "2px 0", fontSize: "11px" }}>{item.quantity ?? 1}</td>
                  <td style={{ textAlign: "right", padding: "2px 0", fontSize: "11px" }}>
                    {formatCurrency((item.quantity ?? 1) * (item.price ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />
        </div>
      )}

      {/* Totals */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px" }}>
          <span>TỔNG CỘNG:</span>
          <span>{formatCurrency(order.totalPrice ?? 0)}</span>
        </div>
        {(order.deposit ?? 0) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
            <span>Tiền cọc:</span>
            <span>-{formatCurrency(order.deposit ?? 0)}</span>
          </div>
        )}
        {(order.deposit ?? 0) > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "13px" }}>
            <span>CÒN LẠI:</span>
            <span>{formatCurrency(remaining)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "11px" }}>
        <div>Cảm ơn quý khách!</div>
        <div>--- LiveTracker ---</div>
      </div>
    </div>
  );
}
