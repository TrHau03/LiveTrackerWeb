"use client";

import React from "react";
import { useConfigHeader } from "@/hooks/use-config-header";
import { useTheme } from "@/components/theme-provider";
import { useHeaderStore } from "@/lib/store/header-store";

const SunIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M12 18a6 6 0 100-12 6 6 0 000 12zM12 2v4m0 8v4M2 12h4m8 0h4M4.22 4.22l2.83 2.83m5.9 5.9l2.83 2.83M4.22 19.78l2.83-2.83m5.9-5.9l2.83-2.83" />
    </svg>
);

const MoonIcon = () => (
    <svg fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

export function Header() {
    const config = useConfigHeader();
    const dynamicHeader = useHeaderStore();
    const { theme, toggleTheme } = useTheme();

    const title = dynamicHeader.title || config.title;
    const subtitle = dynamicHeader.subtitle || config.subtitle;
    const showDateRange = dynamicHeader.showDateRange !== undefined ? dynamicHeader.showDateRange : config.showDateRange;
    const actions = dynamicHeader.actions.length > 0 ? dynamicHeader.actions : (config.actions || []);

    return (
        <header className="bg-transparent px-4 sm:px-8 py-3 border-b border-[var(--border)]">
            <div className="flex flex-col gap-3">
                {/* Top Row: Title & Right Side Controls */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-xl font-bold text-[var(--foreground)] truncate transition-all duration-300">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-[var(--muted)] mt-0.5 truncate uppercase tracking-wider font-medium opacity-70">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Custom Content Area (e.g., Period Selectors) */}
                        {dynamicHeader.customContent && (
                            <div className="hidden lg:flex items-center mr-2">
                                {dynamicHeader.customContent}
                            </div>
                        )}

                        {/* Date Range Controls */}
                        {showDateRange && (
                            <div className="hidden md:flex items-center gap-2">
                                <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--muted)] shadow-sm border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                                    <span>{dynamicHeader.startDate || "10-06-2021"}</span>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                                <div className="flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--muted)] shadow-sm border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                                    <span>{dynamicHeader.endDate || "10-10-2021"}</span>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        )}

                        {/* Theme Toggle */}
                        {config.showThemeToggle && (
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] shadow-sm border border-[var(--border)] transition"
                                aria-label="Toggle theme"
                            >
                                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                            </button>
                        )}

                        {/* Desktop Actions */}
                        {actions.length > 0 && (
                            <div className="hidden lg:flex items-center gap-2 ml-2">
                                {actions.map((action, idx) => {
                                    if (action.hidden) return null;
                                    const buttonClasses = {
                                        primary: "inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]",
                                        secondary: "inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-muted)]",
                                        danger: "inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100",
                                    };
                                    return (
                                        <button 
                                            key={action.id || action.label || `action-${idx}`} 
                                            onClick={action.onClick} 
                                            className={`${buttonClasses[action.variant || "secondary"]} ${action.className || ""}`}
                                        >
                                          {action.icon && <span className="mr-2">{action.icon}</span>}
                                          {action.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Row: Mobile Custom Content or Actions */}
                {(dynamicHeader.customContent || actions.length > 0) && (
                    <div className="flex lg:hidden flex-wrap gap-2 items-center">
                        {dynamicHeader.customContent}
                        {actions.map((action, idx) => {
                            if (action.hidden) return null;
                            const buttonClasses = {
                                primary: "inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--primary-strong)]",
                                secondary: "inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-bold text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-muted)]",
                                danger: "inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100",
                            };
                            return (
                                <button key={action.id || action.label || `btn-${idx}`} onClick={action.onClick} className={`${buttonClasses[action.variant || "secondary"]} ${action.className || ""}`}>
                                    {action.icon && <span className="mr-1.5">{action.icon}</span>}
                                    {action.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </header>
    );
}
