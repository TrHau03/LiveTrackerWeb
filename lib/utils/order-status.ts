export type OrderStatus = "pending" | "delivering" | "success" | "faild" | "cancel";
export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "delivering",
  "success",
  "faild",
  "cancel",
];

export function normalizeOrderStatus(status?: string | null): OrderStatus {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case "pending":
      return "pending";
    case "delivering":
      return "delivering";
    case "success":
      return "success";
    case "faild":
    case "failed":
      return "faild";
    case "cancel":
    case "cancelled":
    case "canceled":
      return "cancel";
    default:
      return "pending";
  }
}

export function getOrderStatusLabel(status?: string | null): string {
  switch (normalizeOrderStatus(status)) {
    case "delivering":
      return "Đang giao";
    case "success":
      return "Thành công";
    case "faild":
      return "Thất bại";
    case "cancel":
      return "Đã hủy";
    case "pending":
    default:
      return "Chờ xử lý";
  }
}

export function getOrderStatusColors(status?: string | null): {
  bg: string;
  border: string;
  text: string;
  dot: string;
  animate: boolean;
} {
  switch (normalizeOrderStatus(status)) {
    case "delivering":
      return {
        bg: "bg-blue-50 dark:bg-blue-900/20",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-700 dark:text-blue-400",
        dot: "bg-blue-500",
        animate: true,
      };
    case "success":
      return {
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
        border: "border-emerald-200 dark:border-emerald-800",
        text: "text-emerald-700 dark:text-emerald-400",
        dot: "bg-emerald-500",
        animate: false,
      };
    case "faild":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        text: "text-red-700 dark:text-red-400",
        dot: "bg-red-500",
        animate: false,
      };
    case "cancel":
      return {
        bg: "bg-gray-100 dark:bg-gray-800/50",
        border: "border-gray-200 dark:border-gray-700",
        text: "text-gray-600 dark:text-gray-400",
        dot: "bg-gray-400",
        animate: false,
      };
    case "pending":
    default:
      return {
        bg: "bg-orange-50 dark:bg-orange-900/20",
        border: "border-orange-200 dark:border-orange-800",
        text: "text-orange-700 dark:text-orange-400",
        dot: "bg-orange-500",
        animate: true,
      };
  }
}
