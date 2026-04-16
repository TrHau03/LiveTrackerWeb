"use client";

import React, { useState, useDeferredValue } from "react";
import Link from "next/link";
import { useCustomers, useCustomerDetail } from "@/hooks/use-customers";
import { useHeaderStore } from "@/lib/store/header-store";
import { asRecord, extractApiData, extractCollection, pickString } from "@/lib/proxy-client";

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
} from "@/components/ui/workspace-shared";

export function CustomersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

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
    <div className="space-y-8 pb-28 lg:pb-6">

      <Panel
        title="Customer base"
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

        <div className="grid grid-cols-1 xl:grid-cols-[6fr_4fr] gap-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm order-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--foreground)]">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Số điện thoại</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Lần cuối</th>
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
                        className={`cursor-pointer transition-colors hover:bg-[var(--surface-muted)]/60 ${isActive ? 'bg-[var(--surface-muted)]/80' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${isActive ? 'bg-[var(--primary)]' : 'bg-gray-400 dark:bg-gray-600'}`}>
                              {name[0]?.toUpperCase() || "C"}
                            </div>
                            <span className={`font-semibold ${isActive ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-soft)] font-medium">
                          {pickString(customer, ["phone"]) || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted)]">
                          {compactDate(pickString(customer, ["updatedAt", "createdAt"]))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <PanelInset title="Customer Profile">
            {detailState.status === "idle" || detailState.status === "loading" ? (
              <LoadingState compact />
            ) : detailState.status === "error" ? (
              <ErrorState message={detailState.error} compact />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 border-b border-[var(--border)] pb-6 pt-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-semibold text-white shadow-sm ring-4 ring-[var(--surface-muted)]">
                    {(pickString(detail, ["igName", "name"]) || "C")[0]?.toUpperCase()}
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
                    <dt className="font-medium text-[var(--muted)]">Phone</dt>
                    <dd className="font-medium text-[var(--foreground)]">{pickString(detail, ["phone"]) || "No phone"}</dd>
                  </div>
                  <div className="flex justify-between py-4">
                    <dt className="font-medium text-[var(--muted)]">Birthday</dt>
                    <dd className="text-[var(--foreground)]">{formatDateTime(pickString(detail, ["dayOfBirth"]))}</dd>
                  </div>
                  <div className="flex justify-between py-4">
                    <dt className="font-medium text-[var(--muted)]">Address</dt>
                    <dd className="w-2/3 text-right text-[var(--foreground)]">{compactAddress(detail) || "No address"}</dd>
                  </div>
                  <div className="flex justify-between pt-4">
                    <dt className="font-medium text-[var(--muted)]">Notes</dt>
                    <dd className="w-2/3 text-right text-[var(--foreground)]">{pickString(detail, ["note"]) || "No notes"}</dd>
                  </div>
                </dl>

                <div className="pt-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <span className="text-sm text-[var(--muted)]">No tags</span>
                    ) : (
                      tags.map((tag, index) => (
                        <span key={`${pickString(tag, ["id", "_id"]) || index}`} className="inline-flex rounded-md bg-[color:var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">
                          {pickString(tag, ["label", "name"]) || "Tag"}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Recent History</h4>
                  <div className="space-y-4 border-l-2 border-[var(--border)] pl-3">
                    {histories.length === 0 ? (
                      <span className="text-sm text-[var(--muted)]">Chưa có lịch sử.</span>
                    ) : (
                      histories.slice(0, 4).map((history, index) => (
                        <div key={`${pickString(history, ["id", "_id"]) || index}`} className="relative text-sm">
                          <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-[var(--primary)] ring-4 ring-[var(--surface)]" />
                          <p className="text-[var(--foreground-soft)]">
                            {pickString(history, ["title", "action", "type", "note"]) || "Customer activity"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </PanelInset>
        </div>
      </Panel>
    </div>
  );
}
