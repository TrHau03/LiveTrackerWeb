"use client";

import React, { useState, useDeferredValue } from "react";
import Link from "next/link";
import { useCustomers, useCustomerDetail, useUpdateCustomerProfile } from "@/hooks/use-customers";
import { useOrders } from "@/hooks/use-orders";
import { useHeaderStore } from "@/stores/header-store";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber } from "@/lib/proxy-client";
import { Pencil, ShoppingBag } from "lucide-react";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";

import {
  Hero,
  Panel,
  PanelInset,
  LoadingState,
  ErrorState,
  EmptyState,
  CONTROL_CLASS,
  compactDate,
  formatDateTime,
  compactAddress,
  formatCurrency,
} from "@/components/ui/workspace-shared";

export function CustomersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

  // Edit Form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dayOfBirth: "",
    province: "",
    district: "",
    ward: "",
    street: "",
    note: "",
  });

  const { data: listData, status: listStatus, error: listQueryError } = useCustomers(search);

  const state = {
    status: listStatus === "pending" ? "loading" : listStatus === "success" ? "ready" : "error",
    data: listData || null,
    error: listQueryError ? listQueryError.message : "",
  }

  const customers = extractCollection(state.data);
  const effectiveSelectedCustomerId =
    selectedCustomerId || pickString(customers[0], ["id", "_id"]);

  const { data: detailData, status: detailStatus, error: detailQueryError } = useCustomerDetail(effectiveSelectedCustomerId);

  const detailState = {
    status: detailStatus === "pending" ? "loading" : detailStatus === "success" ? "ready" : "error",
    data: detailData || null,
    error: detailQueryError ? detailQueryError.message : "",
  }

  const detail = asRecord(extractApiData(detailState.data));
  const tags = extractCollection(detail.tags);
  const histories = extractCollection(detail.histories);

  // Mutation and query
  const updateMutation = useUpdateCustomerProfile();
  const { data: ordersData, status: ordersStatus, error: ordersQueryError } = useOrders({
    customerId: effectiveSelectedCustomerId,
    limit: 100,
  });

  const customerOrders = extractCollection(ordersData);

  const handleStartEdit = () => {
    setIsEditing(true);
    setFormData({
      name: pickString(detail, ["name", "igName"]) || "",
      phone: pickString(detail, ["phone"]) || "",
      dayOfBirth: pickString(detail, ["dayOfBirth"]) 
        ? new Date(pickString(detail, ["dayOfBirth"])!).toISOString().substring(0, 10) 
        : "",
      province: pickString(detail, ["province"]) || "",
      district: pickString(detail, ["district"]) || "",
      ward: pickString(detail, ["ward"]) || "",
      street: pickString(detail, ["street"]) || "",
      note: pickString(detail, ["note"]) || "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        customerId: effectiveSelectedCustomerId,
        body: {
          igName: formData.name,
          phone: formData.phone,
          dayOfBirth: formData.dayOfBirth ? new Date(formData.dayOfBirth).toISOString() : undefined,
          province: formData.province,
          district: formData.district,
          ward: formData.ward,
          street: formData.street,
          note: formData.note,
        }
      });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  React.useEffect(() => {
    // Reset edit state when customer changes
    setIsEditing(false);
  }, [effectiveSelectedCustomerId]);

  React.useEffect(() => {
    setHeader({
      title: "Khách hàng",
      subtitle: `Quản lý ${customers.length} hồ sơ khách hàng`,
      showDateRange: false,
      actions: []
    });
    return () => resetHeader();
  }, [customers.length]);

  return (
    <div className="space-y-4 pb-28 lg:pb-6 xl:h-[calc(100vh-99px)] xl:pb-0 pt-0">

      <Panel
        className="xl:h-full xl:flex xl:flex-col xl:overflow-hidden xl:[&>div:last-child]:flex-1 xl:[&>div:last-child]:overflow-hidden xl:[&>div:last-child]:flex xl:[&>div:last-child]:flex-col xl:[&>div:last-child]:min-h-0"
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer"
            className={`${CONTROL_CLASS} w-full md:w-64`}
          />
        }
      >
        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && customers.length === 0 ? (
          <EmptyState message="Chưa có khách hàng phù hợp." />
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-[6fr_4fr] gap-3.5 xl:flex-1 xl:min-h-0 xl:overflow-hidden">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden order-1 xl:h-full xl:overflow-y-auto custom-scrollbar-premium flex flex-col">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-[var(--foreground)]">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium tracking-wider text-[11px]">Khách hàng</th>
                    <th scope="col" className="px-4 py-2.5 font-medium tracking-wider text-[11px]">Số điện thoại</th>
                    <th scope="col" className="px-4 py-2.5 font-medium tracking-wider text-[11px]">Lần cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {customers.map((customer, index) => {
                    const isActive = effectiveSelectedCustomerId === pickString(customer, ["id", "_id"]);
                    const name = pickString(customer, ["igName", "name"]) || "Customer";
                    return (
                      <tr
                        key={`${pickString(customer, ["id", "_id"]) || index}`}
                        onClick={() => setSelectedCustomerId(pickString(customer, ["id", "_id"]) || "")}
                        className={`cursor-pointer transition-colors hover:bg-[var(--hover)] ${isActive ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border)] bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-xs relative">
                              {pickString(customer, ["avatar"]) ? (
                                <>
                                  <img 
                                    src={pickString(customer, ["avatar"])!} 
                                    alt={name} 
                                    className="h-full w-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                                    }} 
                                  />
                                  <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                                    {name[0]?.toUpperCase() || "C"}
                                  </div>
                                </>
                              ) : (
                                <span className="font-bold uppercase">
                                  {name[0]?.toUpperCase() || "C"}
                                </span>
                              )}
                            </div>
                            <span className={`font-medium text-sm ${isActive ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--foreground-soft)] font-medium text-xs">
                          {pickString(customer, ["phone"]) || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--muted)]">
                          {compactDate(pickString(customer, ["updatedAt", "createdAt"]))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4 order-2 xl:h-full xl:overflow-y-auto pr-1 pb-4 custom-scrollbar-premium">
            {/* Panel Hồ sơ khách hàng / Chỉnh sửa */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
              <div className="border-b border-[var(--border)] px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {isEditing ? "Chỉnh sửa thông tin" : "Hồ sơ khách hàng"}
                </h3>
                {detailState.status === "ready" && !isEditing && (
                  <button
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:text-blue-700 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Chỉnh sửa
                  </button>
                )}
              </div>
              <div className="p-5">
                {detailState.status === "idle" || detailState.status === "loading" ? (
                  <LoadingState compact />
                ) : detailState.status === "error" ? (
                  <ErrorState message={detailState.error} compact />
                ) : isEditing ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Tên khách hàng</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                          placeholder="Nhập tên khách hàng"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Số điện thoại</label>
                          <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                            placeholder="Nhập số điện thoại"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Ngày sinh</label>
                          <input
                            type="date"
                            value={formData.dayOfBirth}
                            onChange={(e) => setFormData({ ...formData, dayOfBirth: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Tỉnh / Thành phố</label>
                          <input
                            type="text"
                            value={formData.province}
                            onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                            placeholder="Tỉnh / Thành"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Quận / Huyện</label>
                          <input
                            type="text"
                            value={formData.district}
                            onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                            placeholder="Quận / Huyện"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Phường / Xã</label>
                          <input
                            type="text"
                            value={formData.ward}
                            onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                            placeholder="Phường / Xã"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Đường / Số nhà</label>
                          <input
                            type="text"
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            className={`${CONTROL_CLASS} w-full h-8.5 text-xs`}
                            placeholder="Số nhà, tên đường"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-[var(--muted)] mb-1">Ghi chú</label>
                        <textarea
                          value={formData.note}
                          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                          className="w-full min-h-[60px] rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 text-xs text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                          placeholder="Nhập ghi chú khách hàng..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--hover)] transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--primary)] px-3.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                      >
                        {updateMutation.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-3 border-b border-[var(--border)] pb-5 pt-2">
                      <div className="h-14 w-14 overflow-hidden rounded-full ring-2 ring-[var(--surface-muted)] bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-xl relative">
                        {pickString(detail, ["avatar"]) ? (
                          <>
                            <img 
                              src={pickString(detail, ["avatar"])!} 
                              alt="Avatar" 
                              className="h-full w-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                              }} 
                            />
                            <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                              {(pickString(detail, ["igName", "name"]) || "C")[0]?.toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <span className="font-bold uppercase">
                            {(pickString(detail, ["igName", "name"]) || "C")[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-[var(--foreground)]">
                          {pickString(detail, ["igName", "name"]) || "Customer"}
                        </p>
                        <p className="text-sm text-[var(--muted)]">Instagram user</p>
                      </div>
                    </div>

                    <dl className="space-y-4 divide-y divide-[var(--border)] text-sm">
                      <div className="flex justify-between pb-4">
                        <dt className="font-medium text-[var(--muted)]">Số điện thoại</dt>
                        <dd className="font-semibold text-[var(--foreground)]">{pickString(detail, ["phone"]) || "—"}</dd>
                      </div>
                      <div className="flex justify-between py-4">
                        <dt className="font-medium text-[var(--muted)]">Ngày sinh</dt>
                        <dd className="text-[var(--foreground)]">{formatDateTime(pickString(detail, ["dayOfBirth"]))}</dd>
                      </div>
                      <div className="flex justify-between py-4">
                        <dt className="font-medium text-[var(--muted)]">Địa chỉ</dt>
                        <dd className="w-2/3 text-right text-[var(--foreground)] font-medium leading-relaxed">{compactAddress(detail) || "Chưa cập nhật địa chỉ"}</dd>
                      </div>
                      <div className="flex justify-between pt-4">
                        <dt className="font-medium text-[var(--muted)]">Ghi chú</dt>
                        <dd className="w-2/3 text-right text-[var(--foreground-soft)] italic">{pickString(detail, ["note"]) || "Không có ghi chú nào"}</dd>
                      </div>
                    </dl>

                    <div className="pt-4">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Thẻ tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {tags.length === 0 ? (
                          <span className="text-xs text-[var(--muted)]">Không có tag nào</span>
                        ) : (
                          tags.map((tag, index) => (
                            <span key={`${pickString(tag, ["id", "_id"]) || index}`} className="inline-flex rounded-full bg-[color:var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                              {pickString(tag, ["label", "name"]) || "Tag"}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Hoạt động gần đây</h4>
                      <div className="space-y-4 border-l-2 border-[var(--border)] pl-3">
                        {histories.length === 0 ? (
                          <span className="text-xs text-[var(--muted)] italic">Chưa có lịch sử hoạt động.</span>
                        ) : (
                          histories.slice(0, 4).map((history, index) => (
                            <div key={`${pickString(history, ["id", "_id"]) || index}`} className="relative text-xs">
                              <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)] ring-4 ring-[var(--surface)]" />
                              <p className="text-[var(--foreground-soft)] font-medium">
                                {pickString(history, ["title", "action", "type", "note"]) || "Hoạt động khách hàng"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Đơn hàng đã mua */}
            {detailState.status === "ready" && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
                <div className="border-b border-[var(--border)] px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[var(--primary)]" />
                    Đơn hàng đã mua ({customerOrders.length})
                  </h3>
                </div>
                <div className="p-5">
                  {ordersStatus === "pending" ? (
                    <LoadingState compact />
                  ) : ordersStatus === "error" ? (
                    <ErrorState message={ordersQueryError?.message || "Lỗi lấy đơn hàng"} compact />
                  ) : customerOrders.length === 0 ? (
                    <EmptyState message="Khách hàng chưa có đơn hàng nào." compact />
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                      {customerOrders.map((order, idx) => {
                        const code = pickString(order, ["orderCode", "code"]) || "";
                        const date = pickString(order, ["createdAt"]) || "";
                        const total = pickNumber(order, ["totalPrice", "amount"]) || 0;
                        const qty = pickNumber(order, ["quantity", "itemsCount"]) || 0;
                        const status = pickString(order, ["status"]);
                        return (
                          <div
                            key={`${pickString(order, ["id", "_id"]) || idx}`}
                            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 hover:border-[var(--primary)] transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded">
                                #{code}
                              </span>
                              <span className="text-[10px] text-[var(--muted)] font-medium">
                                {compactDate(date)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-xs text-[var(--foreground-soft)] font-medium">
                                {qty} sản phẩm
                              </span>
                              <span className="text-xs font-bold text-[var(--foreground)]">
                                {formatCurrency(total)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/30 mt-1">
                              <span className="text-[10px] text-[var(--muted)] font-medium">Trạng thái</span>
                              <OrderStatusBadge status={status} size="sm" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
