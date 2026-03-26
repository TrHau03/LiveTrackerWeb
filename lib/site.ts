export const siteConfig = {
  name: "LiveTracker Web",
  title: "LiveTracker Web | Dashboard, livestream webhook và vận hành bán hàng",
  description:
    "Ứng dụng web quản trị LiveTracker với dashboard, màn hình livestream nghe webhook comment, quản lý đơn hàng, quản lý customer và API studio.",
  keywords: [
    "LiveTracker",
    "livestream dashboard",
    "Instagram webhook",
    "order management",
    "customer management",
    "Next.js admin app",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const appNavigation = [
  {
    href: "/",
    label: "Dashboard",
    shortLabel: "Home",
    description: "KPIs, profile, subscription và trạng thái hệ thống.",
  },
  {
    href: "/livestreams",
    label: "Livestreams",
    shortLabel: "Live",
    description: "Danh sách live đang lắng nghe webhook và điều hướng vào feed comment.",
  },
  {
    href: "/orders",
    label: "Orders",
    shortLabel: "Orders",
    description: "Quản lý đơn hàng, doanh thu trang hiện tại và export Excel.",
  },
  {
    href: "/customers",
    label: "Customers",
    shortLabel: "Customers",
    description: "Theo dõi hồ sơ khách hàng, tags và địa chỉ.",
  },
  {
    href: "/api-studio",
    label: "API Studio",
    shortLabel: "API",
    description: "Màn hình thao tác toàn bộ endpoint theo tài liệu tích hợp.",
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

