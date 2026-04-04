"use client";

import React from "react";
import { useConfigHeader } from "@/hooks/use-config-header";
import { useTheme } from "@/components/theme-provider";

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
    const { theme, toggleTheme } = useTheme();
    const [startDate, setStartDate] = React.useState("10-06-2021");
    const [endDate, setEndDate] = React.useState("10-10-2021");

    return (
        <header className="bg-transparent px-4 sm:px-8 py-6 border-b border-[var(--border)]">
            <div className="flex flex-col gap-4">
                {/* Title Section */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                            {/* Mobile menu trigger placeholder */}
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] truncate">
                                    {config.title}
                                </h1>
                                {config.subtitle && (
                                    <p className="text-sm text-[var(--muted)] mt-1 truncate">
                                        {config.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side controls */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Date Range - Hidden on mobile */}
                        {config.showDateRange && (
                            <>
                                <div className="hidden md:flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)] shadow-sm border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                                    <span>{startDate}</span>
                                    <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </div>
                                <div className="hidden md:flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--muted)] shadow-sm border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                                    <span>{endDate}</span>
                                    <svg
                                        className="h-3 w-3"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </div>
                            </>
                        )}

                        {/* Theme Toggle */}
                        {config.showThemeToggle && (
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="h-10 w-10 flex items-center justify-center rounded-lg bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] shadow-sm border border-[var(--border)] transition"
                                aria-label="Toggle theme"
                            >
                                {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Action Buttons - Visible on mobile if needed */}
                {config.actions && config.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {config.actions.map((action) => {
                            if (action.hidden) return null;

                            const buttonClasses = {
                                primary:
                                    "inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:opacity-50",
                                secondary:
                                    "inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-muted)] disabled:opacity-50",
                                danger:
                                    "inline-flex h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-100 disabled:opacity-50",
                            };

                            const className = buttonClasses[action.variant || "secondary"];

                            return (
                                <button
                                    key={action.id}
                                    onClick={action.onClick}
                                    className={className}
                                >
                                    {action.icon && <span className="mr-2">{action.icon}</span>}
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
