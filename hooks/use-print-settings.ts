/**
 * usePrintSettings — Hook quản lý print settings với caching 2 lớp.
 * Memory cache + localStorage cache (TTL 5 phút) + API fallback.
 */
"use client";

import { useCallback, useRef } from "react";
import { useSession } from "@/components/session-provider";
import { fetchPrintTemplate } from "@/lib/services/print-settings-service";
import { extractApiData, asRecord } from "@/lib/proxy-client";
import type { PrintContentSettings } from "@/types";

const PRINT_SETTINGS_CACHE_KEY = "lt_print_settings_cache";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Memory cache (survives across re-renders in same session)
const memoryCache = new Map<
  string,
  { settings: PrintContentSettings; timestamp: number }
>();

// ═══════════════════════════════════════════
// DEFAULT SETTINGS
// ═══════════════════════════════════════════

const DEFAULT_ORDER_SETTINGS: PrintContentSettings = {
  storeInfo: { name: true, address: true, phone: true },
  customerInfo: { address: true, phone: true },
  productInfo: {
    product: true,
    quantity: true,
    price: true,
    productList: true,
    totalAmount: true,
  },
};

const DEFAULT_COMMENT_SETTINGS: PrintContentSettings = {
  storeInfo: { name: true, address: true, phone: true },
  customerInfo: { address: false, phone: false },
  productInfo: {
    product: true,
    quantity: true,
    price: true,
    productList: false,
    totalAmount: false,
  },
};

// ═══════════════════════════════════════════
// MAPPING API → Internal Settings
// ═══════════════════════════════════════════

function mapPrintTemplateToSettings(
  apiData: Record<string, unknown>,
  type: "order" | "comment",
): PrintContentSettings {
  if (type === "order") {
    const tmpl = asRecord(apiData.orderTemplate);
    if (Object.keys(tmpl).length === 0) return DEFAULT_ORDER_SETTINGS;

    const shopInfo = asRecord(tmpl.shopInfo);
    const customerInfo = asRecord(tmpl.customerInfo);
    const productInfo = asRecord(tmpl.productInfo);

    return {
      storeInfo: {
        name: shopInfo.name !== false,
        address: shopInfo.address !== false,
        phone: shopInfo.phone !== false,
      },
      customerInfo: {
        address: customerInfo.address !== false,
        phone: customerInfo.phone !== false,
      },
      productInfo: {
        product: productInfo.productList !== false,
        quantity: productInfo.productList !== false,
        price: productInfo.productList !== false,
        productList: productInfo.productList !== false,
        totalAmount: productInfo.totalAmount !== false,
      },
    };
  }

  // comment
  const tmpl = asRecord(apiData.commentTemplate);
  if (Object.keys(tmpl).length === 0) return DEFAULT_COMMENT_SETTINGS;

  const shopInfo = asRecord(tmpl.shopInfo);
  const productInfo = asRecord(tmpl.productInfo);

  return {
    storeInfo: {
      name: shopInfo.name !== false,
      address: shopInfo.address !== false,
      phone: shopInfo.phone !== false,
    },
    customerInfo: { address: false, phone: false },
    productInfo: {
      product: productInfo.product !== false,
      quantity: productInfo.quantity !== false,
      price: productInfo.price !== false,
      productList: false,
      totalAmount: false,
    },
  };
}

// ═══════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════

export function usePrintSettings() {
  const { session } = useSession();
  const fetchingRef = useRef<Promise<PrintContentSettings> | null>(null);

  const getPrintSettings = useCallback(
    async (type: "order" | "comment"): Promise<PrintContentSettings> => {
      // 1. Check memory cache
      const cached = memoryCache.get(type);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.settings;
      }

      // 2. Check localStorage
      try {
        const stored = localStorage.getItem(PRINT_SETTINGS_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed[type] && parsed[`${type}_ts`]) {
            const ts = parsed[`${type}_ts`] as number;
            if (Date.now() - ts < CACHE_TTL_MS) {
              const settings = parsed[type] as PrintContentSettings;
              memoryCache.set(type, { settings, timestamp: ts });
              return settings;
            }
          }
        }
      } catch {
        /* ignore parse errors */
      }

      // 3. Fetch from API (deduplicate concurrent calls)
      if (!fetchingRef.current) {
        fetchingRef.current = (async () => {
          try {
            const response = await fetchPrintTemplate(session);
            const apiData = asRecord(extractApiData(response.data));
            const settings = mapPrintTemplateToSettings(apiData, type);

            // Save to both caches
            const now = Date.now();
            memoryCache.set(type, { settings, timestamp: now });
            try {
              const stored = JSON.parse(
                localStorage.getItem(PRINT_SETTINGS_CACHE_KEY) || "{}",
              );
              stored[type] = settings;
              stored[`${type}_ts`] = now;
              localStorage.setItem(
                PRINT_SETTINGS_CACHE_KEY,
                JSON.stringify(stored),
              );
            } catch {
              /* ignore */
            }

            return settings;
          } finally {
            fetchingRef.current = null;
          }
        })();
      }

      return fetchingRef.current;
    },
    [session],
  );

  const invalidateCache = useCallback((type?: "order" | "comment") => {
    if (type) {
      memoryCache.delete(type);
    } else {
      memoryCache.clear();
    }
    try {
      if (type) {
        const stored = JSON.parse(
          localStorage.getItem(PRINT_SETTINGS_CACHE_KEY) || "{}",
        );
        delete stored[type];
        delete stored[`${type}_ts`];
        localStorage.setItem(
          PRINT_SETTINGS_CACHE_KEY,
          JSON.stringify(stored),
        );
      } else {
        localStorage.removeItem(PRINT_SETTINGS_CACHE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return { getPrintSettings, invalidateCache };
}
