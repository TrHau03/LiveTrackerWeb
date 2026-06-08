"use client";

import React, { useState } from "react";
import { useDeliveryOrderById, useCancelDeliveryOrder, usePrintDeliveryOrder } from "@/hooks/use-delivery";
import { X, Copy, Truck, MapPin, Calendar, Circle, CreditCard, ChevronRight, AlertTriangle, Trash2, RefreshCw, Printer } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/proxy-client";
import { SECONDARY_BUTTON_CLASS, CONTROL_CLASS } from "@/components/ui/workspace-shared";
import { DeliveryDetailTrackingEvent } from "@/types/delivery";

export const JT_STATUS_MAP: Record<number | string, string> = {
  "103": "Đặt hàng",
  "104": "Lấy hàng thất bại",
  "105": "Hủy đơn",
  "106": "Nhận hàng",
  "109": "Quét mã gửi hàng",
  "110": "Quét hàng đến",
  "112": "Quét phát hàng",
  "113": "Ký nhận CPN",
  "116": "Đang chuyển hoàn",
  "117": "Ký nhận chuyển hoàn",
  "118": "Kiện vấn đề phát hàng ",
  "120": "Kiện vấn đề chuyển hoàn ",
  "121": "Kết thúc",
};

export function getDeliveryTrackingEventTitle(
  event: DeliveryDetailTrackingEvent,
  provider?: string | null,
) {
  const isJt = provider?.toLowerCase().includes("jt") || provider?.toLowerCase().includes("j&t");

  if (isJt && event.typeCode && JT_STATUS_MAP[event.typeCode]) {
    return JT_STATUS_MAP[event.typeCode];
  }

  return event.typeName || event.description || event.status || "";
}

interface DeliveryDetailModalProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshList: () => void;
}

export function DeliveryDetailModal({ orderId, isOpen, onClose, onRefreshList }: DeliveryDetailModalProps) {
  const { data: detail, isLoading, refetch } = useDeliveryOrderById(orderId);
  const cancelOrder = useCancelDeliveryOrder();
  const { mutate: printOrder, isPending: isPrinting } = usePrintDeliveryOrder();

  const handlePrint = () => {
    if (!detail) return;
    const provider = detail.provider;
    const trackingCode = detail.shipment?.txlogisticId || detail.shipment?.orderCode || detail.shipment?.billCode || detail.shipment?.labelId;

    if (!trackingCode) {
      alert("Không thể tìm thấy mã vận đơn để thực hiện in.");
      return;
    }

    printOrder({
      provider,
      orderCode: trackingCode,
      providerConfigId: detail.providerConfigId,
    }, {
      onError: (err: any) => {
        alert(err?.message || "In vận đơn thất bại.");
      }
    });
  };

  const [cancelReason, setCancelReason] = useState("Hủy đơn hàng từ LiveTracker Web");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Esc key down listener to close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const handleCopy = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    // Có thể bổ sung toast nhỏ thông báo
  };

  const handleCancelOrder = async () => {
    if (!detail) return;
    setCancelError(null);

    const provider = detail.provider;
    const trackingCode = detail.shipment?.txlogisticId || detail.shipment?.orderCode || detail.shipment?.billCode;

    if (!trackingCode) {
      setCancelError("Không thể tìm thấy mã vận đơn để hủy.");
      return;
    }

    try {
      let bizContent: any = {};
      if (provider === "ghn") {
        bizContent = { order_codes: [trackingCode] };
      } else if (provider === "ghtk") {
        bizContent = { id: trackingCode };
      } else {
        bizContent = { txlogisticId: trackingCode, reason: cancelReason };
      }

      await cancelOrder.mutateAsync({
        provider,
        body: { bizContent }
      });

      setShowCancelConfirm(false);
      refetch();
      onRefreshList();
    } catch (err: any) {
      setCancelError(err.message || "Không thể hủy đơn hàng.");
    }
  };

  const trackingEvents = (() => {
    if (!detail) return [];
    
    // Get raw events
    let rawEvents: DeliveryDetailTrackingEvent[] = [];
    const history = detail.tracking?.history || [];
    if (history.length > 0) {
      rawEvents = [...history];
    } else {
      const logs = detail.logs || [];
      rawEvents = logs.map((e) => ({
        ...e,
        time: e.time || e.updatedAt || e.receivedAt,
        description: e.description || e.status,
        typeName: e.typeName || e.status,
      }));
    }

    // Sort by time descending
    const sorted = [...rawEvents].sort(
      (l, r) => new Date(r.time || r.receivedAt || 0).getTime() - new Date(l.time || l.receivedAt || 0).getTime()
    );

    // Deduplicate by time (nearest minute) + title + locationName
    const unique: DeliveryDetailTrackingEvent[] = [];
    const seen = new Set<string>();

    for (const event of sorted) {
      const timeStr = event.time || event.receivedAt || "";
      const timeKey = timeStr ? Math.floor(new Date(timeStr).getTime() / 60000) : 0;
      
      const titleText = getDeliveryTrackingEventTitle(event, detail.provider) || "Cập nhật trạng thái";
      const locKey = (event.locationName || "").trim();
      
      const key = `${timeKey}-${titleText.trim()}-${locKey}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(event);
      }
    }

    return unique;
  })();

  const isCancelled = detail?.status === "cancelled" || detail?.status === "cancel";
  const primaryCode = detail?.shipment?.billCode || detail?.shipment?.txlogisticId || detail?.shipment?.orderCode || "";
  const secondaryCode = detail?.shipment?.clientOrderCode || "";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm select-none animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-spring-scale"
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-[var(--primary)]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--foreground)]">Chi tiết vận đơn</h3>
              <p className="text-[10px] text-[var(--muted)] mt-0.5 uppercase font-mono">ID: {orderId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {detail && primaryCode && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-blue-500 hover:bg-blue-500/10 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="In vận đơn"
              >
                {isPrinting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                <span className="text-xs font-semibold hidden sm:inline">In vận đơn</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : !detail ? (
          <div className="flex-1 py-16 text-center">
            <p className="text-xs text-[var(--muted)]">Không tìm thấy thông tin vận đơn này.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar-premium">

            {/* Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/10 p-4">
              <div className="space-y-1">
                <span className="block text-[10px] text-[var(--muted)] uppercase font-semibold">Mã vận đơn</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-[var(--foreground)]">{primaryCode || "Chưa cấp"}</span>
                  {primaryCode && (
                    <button
                      onClick={() => handleCopy(primaryCode)}
                      className="text-[var(--muted)] hover:text-[var(--primary)] transition p-1 hover:bg-[var(--hover)] rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-[var(--muted)] uppercase font-semibold">Mã đơn gốc</span>
                <span className="block font-mono text-xs font-semibold text-[var(--foreground-soft)]">{secondaryCode || "N/A"}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[10px] text-[var(--muted)] uppercase font-semibold">Nhà vận chuyển</span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
                    {detail.provider}
                  </span>
                  {isCancelled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 border border-red-500/10">
                      Đã hủy
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 border border-green-500/10">
                      Đang xử lý
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Contacts Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
                <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--primary)]" />
                  Người gửi (Shop)
                </h4>
                <div className="space-y-1.5 text-xs text-[var(--foreground-soft)]">
                  <p><span className="font-semibold text-[var(--foreground)]">Tên:</span> {detail.sender?.name || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--foreground)]">SĐT:</span> {detail.sender?.phone || detail.sender?.mobile || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--foreground)]">Địa chỉ:</span> {detail.sender?.address || "N/A"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
                <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
                  <MapPin className="w-3.5 h-3.5 text-green-500" />
                  Người nhận (Khách hàng)
                </h4>
                <div className="space-y-1.5 text-xs text-[var(--foreground-soft)]">
                  <p><span className="font-semibold text-[var(--foreground)]">Tên:</span> {detail.receiver?.name || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--foreground)]">SĐT:</span> {detail.receiver?.phone || detail.receiver?.mobile || "N/A"}</p>
                  <p><span className="font-semibold text-[var(--foreground)]">Địa chỉ:</span> {detail.receiver?.address || "N/A"}</p>
                </div>
              </div>
            </div>

            {/* Package & Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
                <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  Thông tin kiện hàng
                </h4>
                <div className="space-y-1.5 text-xs text-[var(--foreground-soft)]">
                  <p><span className="font-semibold text-[var(--foreground)]">Trọng lượng:</span> {detail.packageInfo?.weight} {detail.provider === "ghn" ? "g" : "kg"}</p>
                  <p>
                    <span className="font-semibold text-[var(--foreground)]">Kích thước:</span>{" "}
                    {detail.packageInfo?.length && detail.packageInfo?.width && detail.packageInfo?.height
                      ? `${detail.packageInfo.length}x${detail.packageInfo.width}x${detail.packageInfo.height} cm`
                      : "N/A"}
                  </p>
                  <p><span className="font-semibold text-[var(--foreground)]">Nội dung:</span> {detail.packageInfo?.content || "Không ghi chú"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4 space-y-3 bg-[var(--surface)]">
                <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5 border-b border-[var(--border)] pb-2">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                  Chi phí & Thanh toán
                </h4>
                <div className="space-y-1.5 text-xs text-[var(--foreground-soft)]">
                  <p><span className="font-semibold text-[var(--foreground)]">Tiền COD:</span> {formatCurrency(Number(detail.amount?.codMoney || detail.amount?.codAmount || 0))}</p>
                  <p><span className="font-semibold text-[var(--foreground)]">Khai giá:</span> {formatCurrency(Number(detail.amount?.goodsValue || detail.amount?.insuranceValue || 0))}</p>
                  <p>
                    <span className="font-semibold text-[var(--foreground)]">Phí vận chuyển dự tính:</span>{" "}
                    {formatCurrency(Number(detail.amount?.estimatedShippingFee || detail.amount?.totalFee || 0))}
                  </p>
                </div>
              </div>
            </div>

            {/* Tracking History Timeline */}
            <div className="rounded-xl border border-[var(--border)] p-4 space-y-4 bg-[var(--surface)]">
              <h4 className="text-xs font-bold text-[var(--foreground)] border-b border-[var(--border)] pb-2">
                Hành trình vận đơn
              </h4>

              {trackingEvents.length === 0 ? (
                <p className="text-xs text-[var(--muted)] text-center py-4">Chưa có cập nhật lịch sử logistics.</p>
              ) : (
                <div className="relative pl-6 border-l-2 border-dashed border-[var(--border)] ml-3 space-y-6 py-2">
                  {trackingEvents.map((event, idx) => {
                    const isNewest = idx === 0;
                    return (
                      <div key={idx} className="relative">
                        <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full flex items-center justify-center ${isNewest
                            ? "bg-[var(--primary)] text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10"
                            : "bg-[var(--surface)] border border-[var(--border)]"
                          }`}>
                          <Circle className={`h-2 w-2 ${isNewest ? "fill-white stroke-none" : "text-[var(--muted)] fill-none"}`} />
                        </span>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const titleText = getDeliveryTrackingEventTitle(event, detail.provider) || "Cập nhật trạng thái";
                              const hasGenericDesc = titleText === "Cập nhật trạng thái";

                              const displayTitle = hasGenericDesc && event.locationName
                                ? event.locationName
                                : titleText;

                              const showLocationBadge = event.locationName && displayTitle !== event.locationName;
                              const showExtraDescription = event.description && 
                                event.description !== titleText && 
                                event.description !== "Cập nhật trạng thái";

                              return (
                                <div className="space-y-1 w-full">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-xs font-bold ${isNewest ? "text-[var(--foreground)]" : "text-[var(--foreground-soft)]"}`}>
                                      {displayTitle}
                                    </span>
                                    {showLocationBadge && (
                                      <span className="text-[10px] font-medium bg-[var(--surface-muted)] px-1.5 py-0.5 rounded text-[var(--muted)]">
                                        {event.locationName}
                                      </span>
                                    )}
                                  </div>
                                  {showExtraDescription && (
                                    <p className="text-[11px] text-[var(--foreground-soft)] italic leading-relaxed mt-0.5">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <p className="text-[10px] text-[var(--muted)] font-medium">
                            {formatDateTime(event.time || event.receivedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cancel Order Section */}
            {!isCancelled && (
              <div className="border border-red-200/50 bg-red-50/10 rounded-xl p-4 space-y-4">
                {!showCancelConfirm ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        Hủy vận đơn giao nhận
                      </h4>
                      <p className="text-[11px] text-[var(--muted)] mt-1">Yêu cầu hủy vận đơn này trên cổng kết nối API của nhà vận chuyển.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCancelConfirm(true)}
                      className={`${SECONDARY_BUTTON_CLASS} py-2 text-red-600 hover:text-white border-red-200 hover:bg-red-600 hover:border-red-600 flex items-center gap-1.5`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Yêu cầu hủy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5 animate-[fadeIn_0.2s_ease-out]">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Lý do hủy đơn hàng <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className={CONTROL_CLASS}
                        placeholder="Nhập lý do hủy đơn"
                      />
                    </div>

                    {cancelError && (
                      <p className="text-xs text-red-500 font-semibold">{cancelError}</p>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCancelConfirm(false)}
                        className={`${SECONDARY_BUTTON_CLASS} py-1 text-xs`}
                      >
                        Bỏ qua
                      </button>
                      <button
                        type="button"
                        disabled={cancelOrder.isPending}
                        onClick={handleCancelOrder}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white shadow-md hover:bg-red-700 disabled:opacity-50 transition-all duration-200"
                      >
                        {cancelOrder.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        Xác nhận hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
