export type HeaderAction = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "secondary" | "danger";
    hidden?: boolean;
};

export type HeaderConfig = {
    path: string;
    title: string;
    subtitle?: string;
    showDateRange?: boolean;
    showThemeToggle?: boolean;
    actions?: HeaderAction[];
    customContent?: React.ReactNode;
};

export const headerConfigs: Record<string, HeaderConfig> = {
    "/": {
        path: "/",
        title: "Dashboard",
        subtitle: "Tổng quan kinh doanh",
        showDateRange: true,
        showThemeToggle: true,
        actions: [],
    },
    "/orders": {
        path: "/orders",
        title: "Đơn Hàng",
        subtitle: "Quản lý và theo dõi đơn hàng",
        showDateRange: true,
        showThemeToggle: true,
        actions: [
            {
                id: "export",
                label: "Xuất Excel",
                variant: "secondary",
            },
            {
                id: "add",
                label: "Thêm Đơn",
                variant: "primary",
            },
        ],
    },
    "/livestreams": {
        path: "/livestreams",
        title: "Live Stream",
        subtitle: "Theo dõi các phiên trực tiếp",
        showDateRange: false,
        showThemeToggle: true,
        actions: [],
    },
    "/customers": {
        path: "/customers",
        title: "Khách Hàng",
        subtitle: "Quản lý và phân tích khách hàng",
        showDateRange: true,
        showThemeToggle: true,
        actions: [
            {
                id: "export",
                label: "Xuất Dữ Liệu",
                variant: "secondary",
            },
            {
                id: "add",
                label: "Thêm Khách",
                variant: "primary",
            },
        ],
    },
    "/settings": {
        path: "/settings",
        title: "Cài Đặt",
        subtitle: "Tùy chỉnh và quản lý hệ thống",
        showDateRange: false,
        showThemeToggle: true,
        actions: [],
    },
};

export function getHeaderConfig(pathname: string): HeaderConfig {
    // Check exact match first
    if (headerConfigs[pathname]) {
        return headerConfigs[pathname];
    }

    // Check prefix match
    for (const [key, config] of Object.entries(headerConfigs)) {
        if (key !== "/" && pathname.startsWith(key)) {
            return config;
        }
    }

    // Default fallback
    return {
        path: pathname,
        title: "Dashboard",
        showDateRange: true,
        showThemeToggle: true,
        actions: [],
    };
}
