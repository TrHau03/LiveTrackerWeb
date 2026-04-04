"use client";

import { usePathname } from "next/navigation";
import { getHeaderConfig } from "@/lib/header-configs";

export function useConfigHeader() {
    const pathname = usePathname();
    const config = getHeaderConfig(pathname);

    return config;
}
