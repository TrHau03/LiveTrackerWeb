/**
 * CommentReceipt — Receipt layout cho hoá đơn chốt comment.
 * Render chính xác theo PRINT_FEATURE_SPECIFICATION.md (576px width, thermal printer).
 */
"use client";

import React from "react";
import { formatPrintDate, formatPrintTime, formatPrintCurrency } from "@/lib/utils/print-utils";
import type { PrintContentSettings } from "@/types";

export type CommentReceiptProps = {
  comment: {
    igUsername?: string;
    text?: string;
    price?: number;
    quantity?: number;
    createdAt?: string;
    backupOf?: string | { _id: string; igUsername?: string; text?: string } | null;
  };
  settings: PrintContentSettings;
  shopInfo: { name: string; address?: string; phone?: string };
  actionType?: "NORMAL" | "BACKUP" | "CONFIRMED_ERROR";
};

function getBackupTargetName(
  backupOf?: string | { _id: string; igUsername?: string } | null,
): string {
  if (!backupOf) return "Tên IG gốc";
  if (typeof backupOf === "object" && backupOf.igUsername) return backupOf.igUsername;
  return "Tên IG gốc";
}

export function CommentReceipt({
  comment,
  settings,
  shopInfo,
  actionType = "NORMAL",
}: CommentReceiptProps) {
  const hasStoreHeader =
    settings.storeInfo.name || settings.storeInfo.address || settings.storeInfo.phone;

  const totalPrice = (comment.price || 0) * (comment.quantity || 1);

  return (
    <div className="receipt" id="comment-receipt">
      {/* ── Shop Header ── */}
      {hasStoreHeader && (
        <div style={{ paddingTop: 40 }}>
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
      )}

      {/* ── Customer Name + Date ── */}
      <div style={{ marginTop: 65, textAlign: "center" }}>
        <div className="title">{comment.igUsername || "Khách hàng"}</div>
        {comment.createdAt && (
          <div className="normal" style={{ marginTop: 20 }}>
            {formatPrintDate(comment.createdAt)} {formatPrintTime(comment.createdAt)}
          </div>
        )}
      </div>

      {/* ── Action Type Badge ── */}
      {actionType === "CONFIRMED_ERROR" && (
        <div className="normal bold text-center" style={{ marginTop: 10 }}>
          *SP đã báo lỗi trên live*
        </div>
      )}
      {actionType === "BACKUP" && (
        <div className="normal bold text-center" style={{ marginTop: 10 }}>
          *Dự bị cho {getBackupTargetName(comment.backupOf)}*
        </div>
      )}

      {/* ── Separator ── */}
      <div style={{ marginTop: 20 }}>
        <hr className="divider" style={{ borderTopWidth: "1.5px" }} />
      </div>

      {/* ── Product (single mode) ── */}
      {settings.productInfo.product && (
        <div style={{ marginTop: 30 }}>
          {settings.productInfo.productList ? (
            // List mode  
            <>
              <div className="row">
                <span className="normal bold">Danh sách sản phẩm</span>
                <span className="normal bold">SL: {comment.quantity || 1}</span>
              </div>
              <div style={{ marginTop: 15 }}>
                <div className="product-item">
                  <span className="product-name">1. {comment.text || "Sản phẩm"}</span>
                  <span className="product-pricing">
                    {settings.productInfo.quantity && `X${comment.quantity || 1}`}
                    {settings.productInfo.price && `  ${formatPrintCurrency(totalPrice)}`}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // Single product mode (large font)
            <div className="row">
              <span className="large">{comment.text || "Sản phẩm"}</span>
              <span className="large">
                {settings.productInfo.quantity && `X${comment.quantity || 1}`}
                {settings.productInfo.price && `  ${formatPrintCurrency(totalPrice)}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <hr className="divider" />
      <div className="text-center" style={{ paddingBottom: 80 }}>
        <div className="small bold">LIVETRACKER.VN</div>
        <div className="small">Quản lý Livestream bán hàng Instagram</div>
      </div>
    </div>
  );
}
