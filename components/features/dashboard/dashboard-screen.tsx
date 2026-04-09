"use client";

import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSession } from "@/components/session-provider";
import { asRecord, extractApiData, extractCollection, pickNumber, pickString, formatNumber } from "@/lib/proxy-client";
import { useDashboard } from "@/hooks/use-dashboard";

import {
  StatCard,
  Panel,
  HeartIcon,
  HomeIcon,
  BagIcon,
  BriefcaseIcon,
  LoadingState,
  ErrorState,
  compactMetric,
} from "@/components/ui/workspace-shared";

export function DashboardScreen() {
  const { session } = useSession();
  const { data, status, error: queryError } = useDashboard();

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const metrics = asRecord(extractApiData(state.data?.dashboard));
  const ordersMetric = compactMetric(metrics.orders);
  const commentsMetric = compactMetric(metrics.comments);
  const livesMetric = compactMetric(metrics.lives);
  const customersMetric = compactMetric(metrics.customers);
  const subscription = asRecord(extractApiData(state.data?.subscription));
  const recentOrders = extractCollection(state.data?.orders).slice(0, 4);
  const notifications = extractCollection(state.data?.notifications).slice(0, 4);

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Save Products"
          value={178}
          icon={<HeartIcon />}
          iconBg="bg-[#eef2ff]"
          iconColor="text-[#1447E6]"
        />
        <StatCard
          label="Stock Products"
          value={20}
          icon={<HomeIcon />}
          iconBg="bg-[#fff9e6]"
          iconColor="text-[#ffc107]"
        />
        <StatCard
          label="Sales Products"
          value={190}
          icon={<BagIcon />}
          iconBg="bg-[#fff0e6]"
          iconColor="text-[#ff8a00]"
        />
        <StatCard
          label="Job Application"
          value={12}
          icon={<BriefcaseIcon />}
          iconBg="bg-[#f3e8ff]"
          iconColor="text-[#a855f7]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <Panel title="Reports" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: '10am', value: 55 },
                { name: '11am', value: 30 },
                { name: '12am', value: 65 },
                { name: '01am', value: 35 },
                { name: '02am', value: 40 },
                { name: '03am', value: 50 },
                { name: '04am', value: 20 },
                { name: '05am', value: 35 },
                { name: '06am', value: 70 },
                { name: '07am', value: 55 },
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1447E6" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg bg-black p-2 text-white shadow-lg">
                          <p className="text-[10px] opacity-70">Sales</p>
                          <p className="text-xs font-bold">{formatNumber(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="url(#lineGradient)" strokeWidth={3} fill="transparent" dot={{ r: 4, fill: '#fff', stroke: '#1447E6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#1447E6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Analytics" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="flex h-[300px] flex-col items-center justify-center">
            <div className="relative flex h-48 w-48 items-center justify-center">
              {/* Simplified Donut Chart via SVG */}
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f4f9" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1447E6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="50" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ff8a00" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="180" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ffc107" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="220" />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-[var(--foreground)]">80%</span>
                <span className="text-[10px] font-medium text-[var(--muted)]">Transactions</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] font-semibold">
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#1447E6]"></span> Sale</div>
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#ffc107]"></span> Distribute</div>
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#ff8a00]"></span> Return</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <Panel title="Recent Orders" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>} className="h-full">
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? <ErrorState message={state.error} /> : null}

          <div className="-mx-5 -mb-5 mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Tracking no</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Product Name</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Price</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-center">Total Order</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="">
                {recentOrders.map((order, index) => (
                  <tr key={`${pickString(order, ["id", "_id", "orderCode"]) || index}`} className="transition border-t border-[var(--border)]">
                    <td className="px-5 py-4 font-medium text-[var(--foreground)] opacity-70">#{pickString(order, ["orderCode", "code"])?.slice(-6) || "876364"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[var(--background)] flex items-center justify-center p-1.5">
                          <img src="/favicon.png" className="h-full w-auto object-contain opacity-40grayscale" />
                        </div>
                        <span className="font-semibold text-[var(--foreground)]">{pickString(order, ["igName", "customerName"]) || "Product"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--foreground)] font-medium opacity-80">${pickNumber(order, ["price"]) || "178"}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-4 py-1.5 bg-[#e1f9fe] text-[#00c2e0] font-bold rounded-md">
                        {pickNumber(order, ["quantity"]) || 325}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-[var(--foreground)]">${formatNumber(pickNumber(order, ["totalPrice", "amount"]) || 146660)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Revenue Summary" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="space-y-6">
            {[
              { name: "NIKE Shoes Black Pattern", price: 87, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop" },
              { name: "iPhone 12", price: 987, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&h=100&fit=crop" }
            ].map((product, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-[var(--background)]">
                  <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">{product.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(s => <svg key={s} className="h-3 w-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[var(--foreground)]">${product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
