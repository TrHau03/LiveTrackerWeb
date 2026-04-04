export const siteConfig = {
  name: "LiveTracker Web",
  title: "LiveTracker Web | SaaS commerce dashboard",
  description:
    "Nền tảng SaaS quản lý livestream commerce với dashboard, đơn hàng, khách hàng và comment realtime trong giao diện tối giản kiểu Apple.",
  keywords: [
    "LiveTracker",
    "livestream commerce",
    "saas dashboard",
    "ecommerce backoffice",
    "order management",
    "customer management",
    "realtime comments",
  ],
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const appNavigation = [
  {
    href: "/",
    label: "BẢN TIN",
    shortLabel: "Bản tin",
  },
  {
    href: "/livestreams",
    label: "Phiên Live",
    shortLabel: "Live",
  },
  {
    href: "/orders",
    label: "Đơn hàng",
    shortLabel: "Đơn",
  },
  {
    href: "/customers",
    label: "Khách hàng",
    shortLabel: "Khách",
  },
  {
    href: "/settings",
    label: "Cài đặt",
    shortLabel: "CĐ",
  },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
