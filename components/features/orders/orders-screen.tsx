"use client";

import React, { useState, useDeferredValue } from "react";
import { useOrders, useExportOrders } from "@/hooks/use-orders";
import { useSettingsStore } from "@/stores/settings-store";
import { asRecord, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import { PrintTemplate } from "@/components/printer/print-template";
import { compactAddress } from "@/components/ui/workspace-shared";

import {
  Hero,
  StatCard,
  Panel,
  BagIcon,
  BriefcaseIcon,
  HomeIcon,
  LoadingState,
  ErrorState,
  EmptyState,
  CONTROL_CLASS,
  PRIMARY_BUTTON_CLASS,
} from "@/components/ui/workspace-shared";

export function OrdersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [printOrder, setPrintOrder] = useState<any>(null);
  const paperSize = useSettingsStore(state => state.paperSize) as "80mm" | "58mm" | "a5";

  const { data, status, error: queryError } = useOrders(search);

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const [exportState, setExportState] = useState("");
  const [range, setRange] = useState({
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });
  const doExport = useExportOrders();

  const orders = extractCollection(state.data);
  const effectiveSelectedOrderId =
    selectedOrderId || pickString(orders[0], ["id", "_id", "orderCode"]);
  const selectedOrder =
    orders.find(
      (order) =>
        pickString(order, ["id", "_id", "orderCode"]) === effectiveSelectedOrderId,
    ) ?? orders[0] ?? null;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (pickNumber(order, ["totalPrice", "amount"]) ?? 0),
    0,
  );
  const totalDeposit = orders.reduce(
    (sum, order) => sum + (pickNumber(order, ["deposit"]) ?? 0),
    0,
  );

  async function handleExport() {
    const result = await doExport(range);
    setExportState(result.ok ? result.filename : "Export failed");
  }

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero title="BẢN TIN BÁN HÀNG" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Đơn cần xử lý"
          value={orders.length}
          icon={<BagIcon />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          label="Tiền về (Doanh thu)"
          value={formatCurrency(totalRevenue)}
          icon={<BriefcaseIcon />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Tiền cọc"
          value={formatCurrency(totalDeposit)}
          icon={<HomeIcon />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      <Panel title="Danh sách Đơn hàng" className="overflow-hidden relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[var(--surface-subdued)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row flex-1 w-full max-w-3xl relative items-center gap-3">
            <div className="flex bg-[var(--surface-strong)] rounded-xl p-1 border border-[var(--border)] shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold shadow-sm">Hôm nay</button>
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] transition-colors">Hôm qua</button>
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] transition-colors">Live vừa rồi</button>
            </div>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã đơn/SĐT"
                className={`${CONTROL_CLASS} w-full pl-10 h-11 text-base rounded-xl`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className={`${PRIMARY_BUTTON_CLASS} h-11 px-5 rounded-xl bg-[#28c840] hover:bg-[#23af37] font-bold`}
            >
              Xuất file đi giao
            </button>
          </div>
        </div>

        {exportState ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
            {exportState}
          </div>
        ) : null}

        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Không có đơn hàng phù hợp." />
        ) : null}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã đơn</th>
                  <th className="px-5 py-3 font-semibold">Tên khách</th>
                  <th className="px-5 py-3 font-semibold">SĐT</th>
                  <th className="px-5 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-5 py-3 font-semibold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order, index) => {
                  const id = pickString(order, ["id", "_id", "orderCode"]);
                  const isActive = selectedOrderId === id;
                  return (
                    <tr
                      key={`${id || index}`}
                      onClick={() => setSelectedOrderId(id || "")}
                      className={`cursor-pointer transition hover:bg-[var(--surface-muted)]/60 ${isActive ? "bg-[var(--primary)]/5" : ""}`}
                    >
                      <td className="px-4 py-2 font-mono text-sm font-semibold text-[var(--primary)]">#{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}</td>
                      <td className="px-4 py-2 font-semibold text-[var(--foreground)] text-base">{pickString(order, ["igName", "customerName"]) || "Khách hàng"}</td>
                      <td className="px-4 py-2 text-[var(--foreground)] font-medium">{pickString(order, ["phone"]) || "—"}</td>
                      <td className="px-4 py-2 font-bold text-right text-[var(--foreground)] text-base">{formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex rounded-full bg-[color:var(--primary-soft)] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">Chờ xử lý</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className={`absolute inset-y-0 right-0 z-20 flex w-full sm:max-w-md flex-col bg-[var(--surface)] shadow-[rgba(0,0,0,0.1)_0px_0px_40px] border-l border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedOrder && selectedOrderId ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {selectedOrder && (
              <>
                <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0 bg-[var(--surface-subdued)]">
                  <div>
                    <h4 className="text-xl font-bold text-[var(--foreground)]">Chi tiết đơn hàng</h4>
                    <p className="font-mono text-sm text-[var(--primary)] font-semibold tracking-widest mt-1 uppercase">
                      #{pickString(selectedOrder, ["orderCode", "code"]) || "Order"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrderId("")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="rounded-2xl bg-[var(--surface-muted)] p-6 text-center shadow-inner">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Khách phải trả</p>
                    <p className="text-5xl font-bold tracking-tight text-[#16a34a]">
                      {formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}
                    </p>
                  </div>

                  <dl className="space-y-5 text-base">
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Tên khách</dt>
                      <dd className="font-bold text-[var(--foreground)] text-lg">{pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng"}</dd>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Số điện thoại</dt>
                      <dd className="font-bold text-[var(--foreground)] text-lg">{pickString(selectedOrder, ["phone"]) || "Chưa gửi"}</dd>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Tiền cọc</dt>
                      <dd className="font-bold text-[#16a34a] text-lg">{formatCurrency(pickNumber(selectedOrder, ["deposit"]) ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <dt className="font-medium text-[var(--muted)]">Thời gian tạo</dt>
                      <dd className="text-[var(--foreground)] font-medium">{formatDateTime(pickString(selectedOrder, ["createdAt", "updatedAt"]))}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 flex flex-col gap-4">
                  <button className="w-full rounded-xl bg-[#1447E6] hover:bg-[#0E3BBF] px-4 py-4 text-base font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    XÁC NHẬN ĐƠN HÀNG
                  </button>
                  <button
                    onClick={() => {
                      const orderData = {
                        orderCode: pickString(selectedOrder, ["orderCode", "code"]) || "Order",
                        customerName: pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng",
                        phone: pickString(selectedOrder, ["phone"]),
                        address: compactAddress(selectedOrder),
                        totalPrice: pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0,
                        deposit: pickNumber(selectedOrder, ["deposit"]) ?? 0,
                        createdAt: pickString(selectedOrder, ["createdAt", "updatedAt"]),
                        shopName: "LiveTracker Shop",
                      };
                      setPrintOrder(orderData);
                    }}
                    className="w-full rounded-xl bg-[#28c840] hover:bg-[#23af37] px-4 py-4 text-base font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    IN VẬN ĐƠN
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Panel>

      {printOrder && (
        <PrintTemplate
          order={printOrder}
          paperSize={paperSize || "80mm"}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}
