# Dynamic Header Configuration Guide

## Overview
The dashboard now has a dynamic header system that changes based on the current page. Each page can have its own title, subtitle, buttons, and controls.

## Quick Start

### How It Works
1. **Header configs** are defined in [lib/header-configs.ts](lib/header-configs.ts)
2. **Page detection** uses the current pathname automatically
3. **Header component** renders based on the config in [components/header.tsx](components/header.tsx)

## Customizing Headers for Pages

### Edit Header Configuration
File: [lib/header-configs.ts](lib/header-configs.ts)

```typescript
export const headerConfigs: Record<string, HeaderConfig> = {
  "/your-page": {
    path: "/your-page",
    title: "Your Page Title",
    subtitle: "Description goes here",
    showDateRange: true,      // Show date pickers
    showThemeToggle: true,     // Show theme toggle button
    actions: [                 // Custom action buttons
      {
        id: "unique-id",
        label: "Button Text",
        variant: "primary",    // "primary" | "secondary" | "danger"
        onClick: () => { /* optional handler */ },
      },
    ],
  },
};
```

## Configuration Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `path` | string | required | Route path (must match page route) |
| `title` | string | required | Main header title |
| `subtitle` | string | optional | Gray subtitle text below title |
| `showDateRange` | boolean | true | Display start/end date dropdowns |
| `showThemeToggle` | boolean | true | Show dark/light mode button |
| `actions` | HeaderAction[] | [] | Array of custom buttons |

### HeaderAction Object

```typescript
type HeaderAction = {
  id: string;                              // Unique identifier
  label: string;                           // Button text
  icon?: React.ReactNode;                  // Optional SVG icon
  onClick?: () => void;                    // Click handler
  variant?: "primary" | "secondary" | "danger";  // Button style
  hidden?: boolean;                        // Conditionally hide button
};
```

## Button Variants

- **primary**: Blue button - for main actions (e.g., "Thêm Đơn")
- **secondary**: Gray border button - for secondary actions (e.g., "Xuất Excel")
- **danger**: Red button - for destructive actions

## Examples

### Dashboard Page
```typescript
"/": {
  path: "/",
  title: "Dashboard",
  subtitle: "Tổng quan kinh doanh",
  showDateRange: true,
  showThemeToggle: true,
  actions: [],
}
```

### Orders Page
```typescript
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
      onClick: () => handleExport(),
    },
    {
      id: "add",
      label: "Thêm Đơn",
      variant: "primary",
      onClick: () => handleAddOrder(),
    },
  ],
}
```

## Adding Action Button Handlers

To add functionality to action buttons:

1. Open [components/header.tsx](components/header.tsx)
2. Add state management or call hooks as needed
3. Pass the handler to the button's `onClick` property

Example with state:
```typescript
export function Header() {
  const config = useConfigHeader();
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // Export logic here
    setIsExporting(false);
  };

  // Modify config before rendering if needed
  if (config.actions && config.path === "/orders") {
    config.actions[0].onClick = handleExport;
  }
  
  return /* ... */;
}
```

## Display Responsiveness

- **Date Range**: Hidden on mobile, shown on md+ screens
- **Subtitle**: Visible on all devices
- **Action Buttons**: Stack vertically on mobile, horizontally on larger screens
- **Theme Toggle**: Always visible

## Current Pages Configured

- `/` - Dashboard
- `/orders` - Orders  
- `/livestreams` - Livestreams
- `/customers` - Customers
- `/settings` - Settings

## Adding a New Page Header

1. Create your new page in the `app/` directory
2. Add configuration to `headerConfigs` in [lib/header-configs.ts](lib/header-configs.ts)
3. The header will automatically update when you navigate to that page

```typescript
"/your-new-page": {
  path: "/your-new-page",
  title: "Your Page Name",
  subtitle: "Description",
  showDateRange: false,
  showThemeToggle: true,
  actions: [
    {
      id: "action1",
      label: "Do Something",
      variant: "primary",
    },
  ],
}
```

## Notes

- The header automatically detects page changes using `usePathname()`
- Prefix matching is supported (e.g., `/orders/*` will match `/orders/123`)
- If a page path is not configured, a default header will be shown
- Date range state is local to the header component
- For complex date handling, consider using date picker libraries
