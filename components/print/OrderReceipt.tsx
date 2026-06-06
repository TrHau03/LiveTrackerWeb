/**
 * OrderReceipt — Receipt layout cho hoá đơn đơn hàng.
 * Render chính xác theo PRINT_FEATURE_SPECIFICATION.md (576px width, thermal printer).
 */
"use client";

import React from "react";
import { formatPrintDate, formatPrintTime, formatPrintCurrency } from "@/lib/utils/print-utils";
import { asRecord, pickString, pickNumber } from "@/lib/proxy-client";
import type { PrintContentSettings } from "@/types";

export type OrderReceiptProps = {
  order: Record<string, unknown>;
  settings: PrintContentSettings;
  shopInfo: { name: string; address?: string; phone?: string };
};

type ReceiptProduct = {
  name: string;
  price: number;
  quantity: number;
};

function extractProducts(order: Record<string, unknown>): ReceiptProduct[] {
  // Comments can come from order.commentIds (populated) or order.comments
  const rawComments = (order.commentIds || order.comments || []) as unknown[];
  if (!Array.isArray(rawComments)) return [];

  return rawComments
    .map((c) => asRecord(c))
    .filter((c) => Object.keys(c).length > 0)
    .filter((c) => pickString(c, ["status"]) !== "BACKUP") // exclude backup comments
    .map((c, index) => ({
      name: pickString(c, ["text", "content"]) || `Sản phẩm ${index + 1}`,
      price: pickNumber(c, ["price"]) ?? 0,
      quantity: pickNumber(c, ["quantity"]) ?? 1,
    }));
}

export function OrderReceipt({ order, settings, shopInfo }: OrderReceiptProps) {
  const customer = asRecord(order.customerId);
  const products = extractProducts(order);
  const orderCode =
    pickString(order, ["orderCode", "code"]) ||
    (pickString(order, ["_id", "id"]) || "").substring(0, 8).toUpperCase();

  const totalQuantity =
    pickNumber(order, ["totalQuantity"]) ??
    products.reduce((sum, p) => sum + p.quantity, 0);

  const totalAmount =
    pickNumber(order, ["totalPrice", "amount"]) ??
    products.reduce((sum, p) => sum + p.price * p.quantity, 0);

  const hasDeposit =
    !!pickString(order, ["depositStatus"]) &&
    (pickNumber(order, ["deposit"]) ?? 0) > 0;
  const depositAmount = pickNumber(order, ["deposit"]) ?? 0;
  const remaining =
    pickNumber(order, ["remainingTotal"]) ?? totalAmount - depositAmount;

  const customerName =
    pickString(customer, ["igName", "igUsername", "name"]) ||
    pickString(order, ["igName", "customerName"]) ||
    "";
  const customerPhone = pickString(customer, ["phone"]) || pickString(order, ["phone"]) || "";
  const customerAddress = [
    pickString(customer, ["street"]) || pickString(order, ["street"]),
    pickString(customer, ["ward"]) || pickString(order, ["ward"]),
    pickString(customer, ["province"]) || pickString(order, ["province"]),
  ]
    .filter(Boolean)
    .join(", ");

  const createdAt = pickString(order, ["createdAt", "created_at"]);

  return (
    <div className="receipt" id="order-receipt">
      {/* ── Shop Header ── */}
      <div style={{ paddingTop: 80 }}>
        {settings.storeInfo.name && shopInfo.name && (
          <div className="title text-center">{shopInfo.name}</div>
        )}
        {settings.storeInfo.address && shopInfo.address && (
          <div className="small text-center">Địa chỉ: {shopInfo.address}</div>
        )}
        {settings.storeInfo.phone && shopInfo.phone && (
          <div className="small text-center">Liên hệ: {shopInfo.phone}</div>
        )}
        <hr className="divider" />
      </div>

      {/* ── Invoice Title ── */}
      <div style={{ marginTop: 50, textAlign: "center" }}>
        <div className="large bold">HOÁ ĐƠN BÁN HÀNG</div>
        <div className="large bold" style={{ marginTop: 70 }}>
          #{orderCode}
        </div>
        <hr className="divider" />
      </div>

      {/* ── Date ── */}
      {createdAt && (
        <>
          <div className="row" style={{ marginTop: 20 }}>
            <span className="normal">Ngày tạo:</span>
            <span className="normal">
              {formatPrintDate(createdAt)} {formatPrintTime(createdAt)}
            </span>
          </div>
          <hr className="divider" />
        </>
      )}

      {/* ── Customer Info ── */}
      <div style={{ marginTop: 20 }}>
        <div className="row">
          <span className="normal">Khách hàng:</span>
          <span className="large bold">{customerName}</span>
        </div>
        {settings.customerInfo.phone && customerPhone && (
          <div className="row" style={{ marginTop: 8 }}>
            <span className="small">SĐT:</span>
            <span className="normal">{customerPhone}</span>
          </div>
        )}
        {settings.customerInfo.address && customerAddress && (
          <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
            <span className="small" style={{ flexShrink: 0 }}>ĐC:</span>
            <span className="normal" style={{ wordWrap: "break-word" as const, flex: 1 }}>
              {customerAddress}
            </span>
          </div>
        )}
      </div>
      <hr className="divider" />

      {/* ── Product List ── */}
      {settings.productInfo.productList && products.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="row">
            <span className="normal bold">Danh sách sản phẩm</span>
            <span className="normal bold">SL: {totalQuantity}</span>
          </div>
          <div style={{ marginTop: 15 }}>
            {products.map((product, i) => (
              <div key={i} className="product-item" style={{ marginTop: 8 }}>
                <span className="product-name">
                  {i + 1}. {product.name}
                </span>
                <span className="product-pricing">
                  X{product.quantity} {formatPrintCurrency(product.price * product.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Total ── */}
      {settings.productInfo.totalAmount && (
        <>
          <hr className="divider" />
          <div className="row" style={{ marginTop: 20 }}>
            <span className="normal bold">Tổng tiền:</span>
            <span className="large bold">{formatPrintCurrency(totalAmount)}</span>
          </div>

          {hasDeposit && (
            <>
              <div className="row" style={{ marginTop: 15 }}>
                <span className="normal">Tiền cọc:</span>
                <span className="large">- {formatPrintCurrency(depositAmount)}</span>
              </div>
              <div className="row" style={{ marginTop: 15 }}>
                <span className="normal bold">Còn lại:</span>
                <span className="large bold">{formatPrintCurrency(remaining)}</span>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Footer ── */}
      <hr className="divider" />
      <div className="text-center" style={{ paddingBottom: 150 }}>
        <div className="small bold">LIVETRACKER.VN</div>
        <div className="small">Quản lý Livestream bán hàng Instagram</div>
      </div>
    </div>
  );
}
