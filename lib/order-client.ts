"use client";

import type { SessionSettings } from "@/lib/workspace-session";
import { proxyRequest } from "@/lib/proxy-client";

export type OrderItem = {
    text: string;
    quantity: number;
    price: number;
};

export type BankInfo = {
    bankCode: string;
    bankAccount: string;
    bankAccountName: string;
};

export type OrderPaymentData = {
    orderCode: string;
    items: OrderItem[];
    totalPrice: number;
    deposit: number;
    qrUrl: string | null;
    bankInfo: BankInfo | null;
    createdAt: string;
};

export type GetOrderResponse = {
    success: boolean;
    message: string;
    data?: OrderPaymentData;
    statusCode?: number;
};

/**
 * Fetch public order details by order code (no authentication required)
 * GET /api/v1/public/orders/{orderCode}
 */
export async function getPublicOrderDetails(
    orderCode: string,
): Promise<GetOrderResponse> {
    try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        // If apiBase already includes /api/v1, don't add it again
        const basePath = apiBase.endsWith("/api/v1") ? apiBase : `${apiBase}/api/v1`;
        const url = `${basePath}/public/orders/${orderCode}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return {
                success: false,
                message: `Failed to fetch order: ${response.status}`,
                statusCode: response.status,
            };
        }

        const responseData = await response.json();
        const orderData = responseData.data || responseData;

        return {
            success: true,
            message: "Order fetched successfully",
            data: orderData as OrderPaymentData,
        };
    } catch (error) {
        console.error("Error fetching public order:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Fetch order details by ID from Backend API (requires authentication)
 * GET /api/v1/orders/:id
 */
export async function getOrderDetails(
    orderId: string,
    session?: SessionSettings,
): Promise<GetOrderResponse> {
    try {
        const defaultSession: SessionSettings = session ?? {
            accessToken: "",
            refreshToken: "",
            user: null,
        };

        const result = await proxyRequest<OrderPaymentData>(defaultSession, {
            path: `/orders/${orderId}`,
            scope: "api",
            method: "GET",
        });

        if (!result.ok) {
            return {
                success: false,
                message: `Failed to fetch order: ${result.status}`,
                statusCode: result.status,
            };
        }

        // Extract data from response
        const responseData = result.data as any;
        const orderData =
            responseData.data || responseData;

        return {
            success: true,
            message: "Order fetched successfully",
            data: orderData as OrderPaymentData,
        };
    } catch (error) {
        console.error("Error fetching order:", error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Format number to Vietnamese currency (VND)
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
    }).format(amount);
}

/**
 * Optional: Log payment action (e.g., user confirmed payment)
 */
export async function logPaymentAction(
    orderId: string,
    action: string,
    session?: SessionSettings,
): Promise<void> {
    try {
        const defaultSession: SessionSettings = session ?? {
            accessToken: "",
            refreshToken: "",
            user: null,
        };

        await proxyRequest(defaultSession, {
            path: `/orders/${orderId}/log`,
            scope: "api",
            method: "POST",
            body: { action, timestamp: new Date().toISOString() },
        });
    } catch (error) {
        console.warn("Failed to log payment action:", error);
        // Don't throw - this is optional logging
    }
}
