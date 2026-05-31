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

// Cache module-level: giữ trạng thái giữa các lần mount/unmount component
let _cachedConnected = false;
let _cachedStatus: BridgeStatus | null = null;
let _activeCheckPromise: Promise<boolean> | null = null; // Khóa tránh gửi trùng request đồng thời

export function useLocalBridge() {
  const [isConnected, setIsConnected] = useState<boolean>(_cachedConnected);
  const [isChecking, setIsChecking] = useState<boolean>(!_cachedConnected);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(_cachedStatus);

  // Ping cục bộ kiểm tra xem chương trình Local Bridge đang chạy hay không
  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (_activeCheckPromise) {
      return _activeCheckPromise;
    }

    _activeCheckPromise = (async () => {
      // Cơ chế retry tối đa 3 lần cho mỗi lần kiểm tra nếu gặp lỗi tạm thời (transient)
      // Giải quyết triệt để vấn đề CORS preflight hoặc DNS resolution bị chậm trong vài giây đầu load trang
      const maxRetries = 3;
      const retryDelayMs = 1000; // 1 giây giữa các lần thử lại

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          // Lần thử đầu tiên cho timeout 3s, các lần thử sau cho timeout 1.5s để fail nhanh hơn
          const timeoutMs = attempt === 1 ? 3000 : 1500;
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch("http://127.0.0.1:13579/status", {
            signal: controller.signal,
            mode: "cors", // Bắt buộc để trigger CORS preflight + PNA đúng chuẩn
          } as RequestInit);
          clearTimeout(timeoutId);

          if (response.ok) {
            const json = await response.json();
            if (json.success && json.data) {
              const status = json.data as BridgeStatus;
              _cachedConnected = true;
              _cachedStatus = status;
              setBridgeStatus(status);
              setIsConnected(true);
              return true;
            }
          }
        } catch (e) {
          console.warn(`[LocalBridge] Lần thử kết nối thứ ${attempt}/${maxRetries} thất bại:`, e);
        }

        // Nếu chưa đạt số lần thử tối đa, chờ rồi thử lại
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      // Chỉ chuyển sang trạng thái Offline/Disconnected sau khi TẤT CẢ các lần thử đều thất bại
      _cachedConnected = false;
      _cachedStatus = null;
      setIsConnected(false);
      setBridgeStatus(null);
      return false;
    })();

    try {
      return await _activeCheckPromise;
    } finally {
      _activeCheckPromise = null;
      setIsChecking(false);
    }
  }, []);

  // Tự động kiểm tra định kỳ mỗi 5 giây
  // Nếu đã cache là connected, bỏ qua lần check đầu tiên để tránh flash "Offline"
  useEffect(() => {
    if (!_cachedConnected) {
      checkStatus();
    }
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Gửi ảnh in (Blob) thô trực tiếp sang Bridge dưới dạng multipart/form-data
  const printViaBridge = useCallback(async (imageBlob: Blob): Promise<{ success: boolean; message?: string }> => {
    try {
      const formData = new FormData();
      formData.append("image", imageBlob, "receipt.jpg");

      const response = await fetch("http://127.0.0.1:13579/print", {
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
      const response = await fetch("http://127.0.0.1:13579/config", {
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
