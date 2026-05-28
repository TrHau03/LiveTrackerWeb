/**
 * useLocalBridge — Hook quản lý kết nối và in ấn qua Golang Local Bridge.
 */
"use client";

import { useState, useEffect, useCallback } from "react";

export interface BridgeConfig {
  printer_type: "usb" | "lan";
  printer_name: string;
  lan_ip: string;
  lan_port: string;
  paper_width: 80 | 58;
  auto_start: boolean;
}

export interface BridgeStatus {
  version: string;
  os: string;
  arch: string;
  config: BridgeConfig;
  usb_printers: string[];
}

export function useLocalBridge() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);

  // Ping cục bộ kiểm tra xem chương trình Local Bridge đang chạy hay không
  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      // Đặt timeout cực nhỏ (600ms) để tránh làm nghẽn trang web nếu Bridge đang offline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);

      const response = await fetch("http://localhost:13579/status", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setBridgeStatus(json.data as BridgeStatus);
          setIsConnected(true);
          return true;
        }
      }
      setIsConnected(false);
      setBridgeStatus(null);
      return false;
    } catch (e) {
      setIsConnected(false);
      setBridgeStatus(null);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Tự động kiểm tra định kỳ mỗi 5 giây
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Gửi ảnh in (Blob) thô trực tiếp sang Bridge dưới dạng multipart/form-data
  const printViaBridge = useCallback(async (imageBlob: Blob): Promise<{ success: boolean; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "receipt.jpg");

      const response = await fetch("http://localhost:13579/print", {
        method: "POST",
        body: formData,
      });

      const json = await response.json();
      return {
        success: json.success,
        message: json.message,
      };
    } catch (e) {
      return {
        success: false,
        message: "Không thể kết nối đến Local Bridge để gửi lệnh in.",
      };
    }
  }, []);

  // Cập nhật cấu hình máy in (chọn USB/LAN, IP, Tên máy in, khổ giấy)
  const saveBridgeConfig = useCallback(async (newConfig: BridgeConfig): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch("http://localhost:13579/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newConfig),
      });

      const json = await response.json();
      if (json.success) {
        // Refresh lại trạng thái ngay sau khi cập nhật config
        await checkStatus();
      }
      return {
        success: json.success,
        message: json.message,
      };
    } catch (e) {
      return {
        success: false,
        message: "Không thể lưu cấu hình, không thể kết nối tới Local Bridge.",
      };
    }
  }, [checkStatus]);

  return {
    isConnected,
    isChecking,
    bridgeStatus,
    checkStatus,
    printViaBridge,
    saveBridgeConfig,
  };
}
