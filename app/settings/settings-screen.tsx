"use client";

import React, { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSession } from "@/components/session-provider";
import { useHeaderStore } from "@/lib/store/header-store";
import { PrintSettingsPanel } from "@/components/print/PrintSettingsPanel";
import { Panel, CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { Globe, Tv, Printer, LogOut, CheckCircle, AlertCircle, RefreshCw, Trash2, User, Network, Usb, Check, AlertTriangle, Cpu, Play } from "lucide-react";
import { useInstagramOAuth } from "@/hooks/use-instagram-oauth";
import { deleteShopFromBackend } from "@/lib/instagram-auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { useLocalBridge, BridgeConfig } from "@/hooks/useLocalBridge";
import { renderReceiptToImage } from "@/lib/printUtils";

export function SettingsScreen() {
  const { session } = useSession();
  const { 
    language, autoReconnectSSE, paperSize, 
    setLanguage, setAutoReconnectSSE, setPaperSize 
  } = useSettingsStore();

  const setHeader = useHeaderStore(state => state.setHeader);
  const resetHeader = useHeaderStore(state => state.resetHeader);

  const [activeTab, setActiveTab] = useState<"general" | "account" | "instagram" | "printer">("general");

  React.useEffect(() => {
    setHeader({
      title: "Cài đặt hệ thống",
      subtitle: "Quản lý tài khoản, cấu hình máy in và thiết lập chung",
      showDateRange: false,
      actions: []
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const [printerConfig, setPrinterConfig] = useState({
    enabled: true,
    autoPrint: true,
  });

  // Local Bridge hooks and states
  const {
    isConnected: isBridgeConnected,
    isChecking: isBridgeChecking,
    bridgeStatus,
    checkStatus,
    printViaBridge,
    saveBridgeConfig,
  } = useLocalBridge();

  const [localConfig, setLocalConfig] = useState<BridgeConfig>({
    printer_type: "lan",
    printer_name: "",
    lan_ip: "192.168.1.100",
    lan_port: "9100",
    paper_width: 80,
    auto_start: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Chỉ đồng bộ config từ bridge 1 lần duy nhất khi kết nối lần đầu
  const hasSyncedRef = React.useRef(false);
  useEffect(() => {
    if (bridgeStatus?.config && !hasSyncedRef.current) {
      setLocalConfig(bridgeStatus.config);
      hasSyncedRef.current = true;
    }
    // Reset flag khi mất kết nối để sync lại nếu reconnect
    if (!bridgeStatus) {
      hasSyncedRef.current = false;
    }
  }, [bridgeStatus]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await saveBridgeConfig(localConfig);
      if (res.success) {
        setFeedbackMsg({ type: "success", text: "Đã lưu cấu hình máy in thành công xuống Local Bridge!" });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        setFeedbackMsg({ type: "error", text: res.message || "Không thể lưu cấu hình máy in." });
      }
    } catch (e: any) {
      setFeedbackMsg({ type: "error", text: "Lỗi kết nối: " + (e.message || e) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setFeedbackMsg(null);
    try {
      const testDiv = document.createElement("div");
      testDiv.style.position = "absolute";
      testDiv.style.top = "-10000px";
      testDiv.style.left = "-10000px";
      testDiv.style.width = localConfig.paper_width === 58 ? "384px" : "576px";
      testDiv.style.padding = "24px 16px";
      testDiv.style.background = "white";
      testDiv.style.color = "black";
      testDiv.style.fontFamily = "monospace";
      testDiv.style.boxSizing = "border-box";
      
      const widthMm = localConfig.paper_width;
      const typeLabel = localConfig.printer_type === "lan" ? "MẠNG LAN (TCP/IP)" : "CỔNG USB";
      const connectionInfo = localConfig.printer_type === "lan" 
        ? `${localConfig.lan_ip}:${localConfig.lan_port}` 
        : (localConfig.printer_name || "Mặc định");

      testDiv.innerHTML = `
        <div style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">LIVETRACKER WEB</div>
        <div style="text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 16px;">HÓA ĐƠN IN THỬ CỤC BỘ</div>
        <div style="border-top: 1px dashed black; margin-bottom: 12px;"></div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="padding: 2px 0; font-weight: bold;">Kiểu in:</td>
            <td style="padding: 2px 0; text-align: right;">${typeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; font-weight: bold;">Kết nối:</td>
            <td style="padding: 2px 0; text-align: right; word-break: break-all;">${connectionInfo}</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; font-weight: bold;">Khổ giấy:</td>
            <td style="padding: 2px 0; text-align: right;">K${widthMm} (${widthMm}mm)</td>
          </tr>
          <tr>
            <td style="padding: 2px 0; font-weight: bold;">Thời gian:</td>
            <td style="padding: 2px 0; text-align: right;">${new Date().toLocaleString("vi-VN")}</td>
          </tr>
        </table>
        <div style="border-top: 1px dashed black; margin: 12px 0;"></div>
        <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 16px; font-style: italic;">
          Chúc mừng! Thiết lập kết nối thành công.<br>Hệ thống đã sẵn sàng in hóa đơn tự động.
        </div>
      `;
      document.body.appendChild(testDiv);
      
      const blob = await renderReceiptToImage(testDiv);
      const res = await printViaBridge(blob);
      if (res.success) {
        setFeedbackMsg({ type: "success", text: "Đã gửi lệnh in thử thành công xuống máy in vật lý!" });
      } else {
        setFeedbackMsg({ type: "error", text: res.message || "Lỗi thiết bị in hoặc máy in đang bận." });
      }
      document.body.removeChild(testDiv);
    } catch (e: any) {
      console.error(e);
      setFeedbackMsg({ type: "error", text: "Lỗi render ảnh in: " + (e.message || e) });
    } finally {
      setIsTesting(false);
    }
  };

  const tabs = [
    { id: "general", label: "Cài đặt chung", desc: "Thiết lập hệ thống & ngôn ngữ", icon: Globe },
    { id: "account", label: "Tài khoản", desc: "Hồ sơ cá nhân & bảo mật", icon: User },
    { id: "instagram", label: "Instagram", desc: "Kết nối & quản lý các shop", icon: InstagramIcon },
    { id: "printer", label: "Máy in nhiệt", desc: "Khổ giấy & thiết lập mẫu in", icon: Printer },
  ];

  return (
    <div className="pb-28 lg:pb-0 pt-0 w-full h-full lg:h-full lg:overflow-hidden select-none flex flex-col">
      <div className="flex flex-col lg:flex-row gap-3.5 items-start w-full flex-1 lg:h-full lg:overflow-hidden">
        
        {/* Menu Sidebar bên trái - cuộn độc lập trên desktop */}
        <div className="w-full lg:w-72 shrink-0 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto pb-3 lg:pb-3 lg:h-full scrollbar-none whitespace-nowrap bg-[var(--surface-muted)]/20 lg:bg-transparent p-1 lg:p-0 rounded-xl border border-[var(--border)] lg:border-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3.5 px-4 py-2.5 lg:py-3.5 rounded-xl border transition-all duration-200 text-left shrink-0 lg:w-full select-none ${
                  isActive
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-[0_4px_12px_rgba(59,130,246,0.25)] font-semibold"
                    : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]"
                }`}
              >
                <div 
                  className={`p-2 rounded-lg shrink-0 transition-colors duration-200 ${
                    isActive 
                      ? "bg-white/15 text-white" 
                      : "bg-[var(--surface-muted)] text-[var(--primary)]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 text-left">
                  <span className="block text-xs lg:text-sm leading-tight">{tab.label}</span>
                  <span 
                    className={`hidden lg:block text-[11px] mt-0.5 leading-none transition-colors duration-200 ${
                      isActive ? "text-white/70" : "text-[var(--muted)]"
                    }`}
                  >
                    {tab.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Nội dung chi tiết bên phải - cuộn độc lập trên desktop */}
        <div className="flex-1 w-full min-w-0 lg:h-full lg:overflow-y-auto lg:pr-2 custom-scrollbar-premium">
          <div className="w-full pb-10 lg:pb-2">
            {activeTab === "general" && (
              <Panel title="Cài đặt hệ thống">
                <div className="space-y-6">
                  {/* Ngôn ngữ */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)] text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[var(--primary)]" />
                        Ngôn ngữ hiển thị
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">Ngôn ngữ hiển thị chính trên toàn bộ Dashboard.</p>
                    </div>
                    <select 
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                      className={`${CONTROL_CLASS} w-full sm:w-44 font-medium`}
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="h-px w-full bg-[var(--border)]" />

                  {/* Tự động kết nối lại SSE */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)] text-sm flex items-center gap-2">
                        <Tv className="w-4 h-4 text-[var(--primary)]" />
                        Tự động kết nối lại (SSE)
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">Tự động khôi phục kết nối livestream khi phát hiện sự cố mạng.</p>
                    </div>
                    <label 
                      className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" 
                      style={{ backgroundColor: autoReconnectSSE ? 'var(--primary)' : 'var(--surface-muted)' }}
                    >
                      <input type="checkbox" checked={autoReconnectSSE} onChange={(e) => setAutoReconnectSSE(e.target.checked)} className="peer sr-only" />
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoReconnectSSE ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                    </label>
                  </div>
                </div>
              </Panel>
            )}

            {activeTab === "account" && (
              <Panel title="Tài khoản & Phân quyền">
                <div className="space-y-6">
                  {/* Profile Card */}
                  <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-muted)] p-5 shadow-[var(--shadow-soft)]">
                    <div className="absolute right-0 top-0 -mr-6 -mt-6 h-24 w-24 rounded-full bg-[var(--primary)] opacity-5 blur-3xl animate-pulse" />
                    <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--primary)] to-blue-500 text-2xl font-bold text-white shadow-md ring-4 ring-white/10 shrink-0">
                        {session.user?.fullName?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold text-[var(--foreground)]">{session.user?.fullName || "Admin"}</p>
                        <p className="truncate text-xs font-medium text-[var(--muted)] mt-1">{session.user?.email || "admin@example.com"}</p>
                        <div className="mt-3 flex justify-center sm:justify-start">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                            Hệ thống
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={() => {
                        import("@/components/session-provider").then(m => {
                          // Get function out of react Context if possible, but for now we just use best effort
                        });
                      }}
                      className={`${SECONDARY_BUTTON_CLASS} text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/30 w-full flex items-center justify-center gap-2 py-5`}
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất khỏi thiết bị này
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {activeTab === "instagram" && (
              <InstagramConnectPanel />
            )}

            {activeTab === "printer" && (
              <Panel title="Máy in nhiệt">
                <div className="space-y-6">
                  {/* Kích hoạt in */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--foreground)] text-sm flex items-center gap-2">
                        <Printer className="w-4 h-4 text-[var(--primary)]" />
                        Kích hoạt in nhãn / vận đơn
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">Cho phép in trực tiếp từ trình duyệt khi tạo hoặc chốt đơn hàng.</p>
                    </div>
                    <label 
                      className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" 
                      style={{ backgroundColor: printerConfig.enabled ? 'var(--primary)' : 'var(--surface-muted)' }}
                    >
                      <input type="checkbox" checked={printerConfig.enabled} onChange={(e) => setPrinterConfig({...printerConfig, enabled: e.target.checked})} className="peer sr-only" />
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${printerConfig.enabled ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                    </label>
                  </div>

                  {printerConfig.enabled && (
                    <>
                      <div className="h-px w-full bg-[var(--border)]" />

                      {/* ─── LOCAL BRIDGE CONFIGURATION PANEL ─── */}
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/30 backdrop-blur-sm overflow-hidden p-5 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)]/60 pb-4">
                          <div>
                            <h3 className="font-bold text-[var(--foreground)] text-sm flex items-center gap-2">
                              <Cpu className="w-4 h-4 text-[var(--primary)]" />
                              Cầu nối máy in (Local Bridge)
                            </h3>
                            <p className="text-[11px] text-[var(--muted)] mt-1">
                              Ứng dụng kết nối trình duyệt với máy in nhiệt LAN hoặc USB chạy cục bộ tại cổng <span className="font-mono">13579</span>.
                            </p>
                          </div>
                          
                          {/* Bridge Status Badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isBridgeChecking ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] border border-[var(--border)]">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                Đang quét...
                              </span>
                            ) : isBridgeConnected ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/20 shadow-[0_2px_8px_rgba(34,197,94,0.1)]">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Đang hoạt động (Online)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/20 shadow-[0_2px_8px_rgba(239,68,68,0.1)]">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                Ngoại tuyến (Offline)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bridge Offline State Guide */}
                        {!isBridgeConnected && !isBridgeChecking && (
                          <div className="rounded-xl border border-red-200/50 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                              <div className="space-y-1 border-b border-red-200/20 dark:border-red-900/20 pb-2.5">
                                <p className="text-xs font-bold text-red-800 dark:text-red-400 leading-tight">Chưa phát hiện LiveTracker Bridge chạy ngầm!</p>
                                <p className="text-[11px] text-red-700/80 dark:text-red-400/70 leading-normal">
                                  Để có thể in hóa đơn trực tiếp qua mạng LAN hoặc USB từ trình duyệt, bạn cần cài đặt và khởi chạy chương trình **LiveTrackerLocalBridge** trên máy tính kết nối trực tiếp với máy in hóa đơn.
                                </p>
                              </div>
                            </div>

                            {/* HTTPS Mixed Content Browser Security Warning */}
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed space-y-1.5">
                              <p className="font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                Lưu ý nếu đã bật ứng dụng nhưng vẫn báo Ngoại tuyến:
                              </p>
                              <p>
                                Nếu bạn đã chạy ứng dụng trong máy (mở link <a href="http://127.0.0.1:13579/status" target="_blank" rel="noreferrer" className="underline font-semibold font-mono text-[var(--primary)] hover:text-blue-600">127.0.0.1:13579/status</a> thấy hiển thị JSON thành công) nhưng web vẫn báo Offline, đó là do **trình duyệt đang âm thầm chặn kết nối HTTP từ trang HTTPS** mà không hiện bất kỳ cảnh báo nào.
                              </p>
                              <p className="font-bold">Cách khắc phục chỉ với 3 bước:</p>
                              <ol className="list-decimal pl-4 space-y-0.5">
                                <li>Click vào **biểu tượng ổ khóa** (hoặc nút cài đặt) ở bên trái thanh địa chỉ trình duyệt.</li>
                                <li>Chọn **Site settings (Cài đặt trang web)**.</li>
                               <li>Tìm mục **Insecure content (Nội dung không an toàn)** và đổi trạng thái sang **Allow (Cho phép)**.</li>
                               <li>Tải lại trang web này (<kbd className="bg-[var(--surface)] border border-[var(--border)] px-1 rounded font-sans font-semibold">F5</kbd>) để kết nối hoạt động ngầm tự động.</li>
                              </ol>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-200/20 dark:border-red-900/20">
                              <button
                                type="button"
                                onClick={() => void checkStatus()}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/40 bg-white dark:bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--hover)] hover:-translate-y-0.5 active:translate-y-0 transition shadow-sm"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Quét lại kết nối
                              </button>
                              <a
                                href="https://github.com/TrHau03/LiveTrackerWeb/releases"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:-translate-y-0.5 active:translate-y-0 transition shadow-sm ml-auto"
                              >
                                <Printer className="h-3 w-3" />
                                Tải LiveTracker Local Bridge
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Bridge Online State Configuration Form */}
                        {isBridgeConnected && (
                          <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
                            {/* OS and App info details */}
                            <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--surface)] p-2.5 border border-[var(--border)]/40 text-[10px] font-mono text-[var(--muted)]">
                              <div>Phiên bản: <span className="text-[var(--foreground)] font-semibold">{bridgeStatus?.version || "1.0.0"}</span></div>
                              <div className="text-right">Hệ điều hành: <span className="text-[var(--foreground)] font-semibold uppercase">{bridgeStatus?.os || "Windows"} ({bridgeStatus?.arch || "amd64"})</span></div>
                            </div>

                            {/* Connection Type Cards */}
                            <div className="space-y-2.5">
                              <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Chọn kiểu kết nối máy in</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                  type="button"
                                  onClick={() => setLocalConfig({ ...localConfig, printer_type: "lan" })}
                                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden select-none group ${
                                    localConfig.printer_type === "lan"
                                      ? "bg-[var(--surface)] border-[var(--primary)] shadow-[0_4px_20px_rgba(59,130,246,0.1)] ring-2 ring-[var(--primary)]/30"
                                      : "bg-[var(--surface-muted)]/40 border-[var(--border)] hover:bg-[var(--surface-muted)]/80 hover:border-[var(--muted)]/50"
                                  }`}
                                >
                                  <div className={`p-3 rounded-xl transition-colors duration-300 ${
                                    localConfig.printer_type === "lan" ? "bg-blue-500/10 text-[var(--primary)]" : "bg-[var(--surface)] text-[var(--muted)]"
                                  }`}>
                                    <Network className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <span className="block text-sm font-bold text-[var(--foreground)]">In qua mạng LAN (TCP/IP)</span>
                                    <span className="block text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed">
                                      Kết nối trực tiếp máy in nhiệt qua dây mạng LAN hoặc Wi-Fi cục bộ. Tốc độ cao, ổn định nhất.
                                    </span>
                                  </div>
                                  {localConfig.printer_type === "lan" && (
                                    <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setLocalConfig({ ...localConfig, printer_type: "usb" })}
                                  className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden select-none group ${
                                    localConfig.printer_type === "usb"
                                      ? "bg-[var(--surface)] border-[var(--primary)] shadow-[0_4px_20px_rgba(59,130,246,0.1)] ring-2 ring-[var(--primary)]/30"
                                      : "bg-[var(--surface-muted)]/40 border-[var(--border)] hover:bg-[var(--surface-muted)]/80 hover:border-[var(--muted)]/50"
                                  }`}
                                >
                                  <div className={`p-3 rounded-xl transition-colors duration-300 ${
                                    localConfig.printer_type === "usb" ? "bg-blue-500/10 text-[var(--primary)]" : "bg-[var(--surface)] text-[var(--muted)]"
                                  }`}>
                                    <Usb className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-4">
                                    <span className="block text-sm font-bold text-[var(--foreground)]">In qua cổng USB trực tiếp</span>
                                    <span className="block text-[11px] text-[var(--muted)] mt-1.5 leading-relaxed">
                                      Kết nối trực tiếp máy in nhiệt bằng dây cáp USB cắm vào máy tính chạy Local Bridge.
                                    </span>
                                  </div>
                                  {localConfig.printer_type === "usb" && (
                                    <div className="absolute right-3 top-3 h-5 w-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Detailed Inputs */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-[var(--surface)] p-4 border border-[var(--border)]/50">
                              {localConfig.printer_type === "lan" ? (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Địa chỉ IP máy in LAN</label>
                                    <input
                                      type="text"
                                      value={localConfig.lan_ip}
                                      onChange={(e) => setLocalConfig({ ...localConfig, lan_ip: e.target.value })}
                                      className={CONTROL_CLASS}
                                      placeholder="Ví dụ: 192.168.1.100"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Cổng in (Port)</label>
                                    <input
                                      type="text"
                                      value={localConfig.lan_port}
                                      onChange={(e) => setLocalConfig({ ...localConfig, lan_port: e.target.value })}
                                      className={CONTROL_CLASS}
                                      placeholder="Mặc định: 9100"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-1.5 md:col-span-2">
                                  <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Lựa chọn máy in USB</label>
                                  {bridgeStatus?.usb_printers && bridgeStatus.usb_printers.length > 0 ? (
                                    <select
                                      value={localConfig.printer_name}
                                      onChange={(e) => setLocalConfig({ ...localConfig, printer_name: e.target.value })}
                                      className={`${CONTROL_CLASS} font-medium`}
                                    >
                                      <option value="">-- Chọn máy in nhiệt USB --</option>
                                      {bridgeStatus.usb_printers.map((printerName) => (
                                        <option key={printerName} value={printerName}>
                                          {printerName}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <div className="space-y-2">
                                      <input
                                        type="text"
                                        value={localConfig.printer_name}
                                        onChange={(e) => setLocalConfig({ ...localConfig, printer_name: e.target.value })}
                                        className={CONTROL_CLASS}
                                        placeholder="Nhập thủ công tên máy in (ví dụ: Xprinter XP-80)"
                                      />
                                      <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-normal flex items-start gap-1">
                                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                        Chưa tự động phát hiện máy in USB nào đang kết nối. Vui lòng cắm dây, bật máy in hoặc nhập tay chính xác tên máy in trong Control Panel.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Paper size config for the bridge hardware itself */}
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Khổ giấy in thô phần cứng</label>
                                <select
                                  value={localConfig.paper_width}
                                  onChange={(e) => setLocalConfig({ ...localConfig, paper_width: parseInt(e.target.value) as 80 | 58 })}
                                  className={`${CONTROL_CLASS} font-medium`}
                                >
                                  <option value={80}>Khổ K80 (80mm - 576px)</option>
                                  <option value={58}>Khổ K58 (58mm - 384px)</option>
                                </select>
                              </div>

                              {/* Windows/Mac Auto Startup toggle */}
                              <div className="flex items-center justify-between pt-5 border-t md:border-t-0 md:border-l border-[var(--border)]/40 md:pl-4">
                                <div className="space-y-0.5">
                                  <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">Tự động khởi động</label>
                                  <p className="text-[10px] text-[var(--muted)] leading-tight">Mở Local Bridge cùng máy tính.</p>
                                </div>
                                <label 
                                  className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" 
                                  style={{ backgroundColor: localConfig.auto_start ? 'var(--primary)' : 'var(--surface-muted)' }}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={localConfig.auto_start} 
                                    onChange={(e) => setLocalConfig({ ...localConfig, auto_start: e.target.checked })} 
                                    className="peer sr-only" 
                                  />
                                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${localConfig.auto_start ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                                </label>
                              </div>
                            </div>

                            {/* Toast Feedback Alert inside the panel */}
                            {feedbackMsg && (
                              <div 
                                className={`rounded-xl border p-3 text-xs leading-normal flex items-start gap-2.5 animate-[fadeIn_0.2s_ease-out] ${
                                  feedbackMsg.type === "success" 
                                    ? "bg-green-50/50 border-green-200/50 text-green-700 dark:bg-green-950/10 dark:border-green-900/30 dark:text-green-400" 
                                    : "bg-red-50/50 border-red-200/50 text-red-700 dark:bg-red-950/10 dark:border-red-900/30 dark:text-red-400"
                                }`}
                              >
                                {feedbackMsg.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0 text-green-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />}
                                <span>{feedbackMsg.text}</span>
                              </div>
                            )}

                            {/* Form buttons */}
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              <button
                                type="button"
                                onClick={handleSaveConfig}
                                disabled={isSaving || isTesting}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                              >
                                {isSaving ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Đang lưu...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Lưu cấu hình Local Bridge
                                  </>
                                )}
                              </button>
                              
                              <button
                                type="button"
                                onClick={handleTestPrint}
                                disabled={isSaving || isTesting}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--surface)] hover:bg-[var(--hover)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none px-4 text-xs font-semibold text-[var(--foreground)] transition-all duration-200"
                              >
                                {isTesting ? (
                                  <>
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    Đang in thử...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 stroke-[2.5]" />
                                    In thử hóa đơn
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="h-px w-full bg-[var(--border)]" />
                      
                      {/* Khổ giấy in */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[var(--foreground)] text-sm">Khổ giấy in mẫu (Bản Web)</h3>
                          <p className="text-xs text-[var(--muted)] mt-1">Lựa chọn kích thước giấy của hóa đơn khi render trên trình duyệt.</p>
                        </div>
                        <select 
                          value={paperSize}
                          onChange={(e) => setPaperSize(e.target.value as "80mm" | "58mm" | "a5")}
                          className={`${CONTROL_CLASS} w-full sm:w-52 font-medium`}
                        >
                          <option value="80mm">K80 (Rộng 80mm)</option>
                          <option value="58mm">K58 (Rộng 58mm)</option>
                          <option value="a5">A5 (Giấy tờ tiêu chuẩn)</option>
                        </select>
                      </div>

                      <div className="h-px w-full bg-[var(--border)]" />
                      
                      {/* Mẫu in */}
                      <div>
                        <h3 className="font-semibold text-[var(--foreground)] text-sm mb-4">Nội dung & Thông tin mẫu in</h3>
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] overflow-hidden p-1 shadow-sm">
                          <div className="bg-[var(--surface)] rounded-lg p-0.5 border border-[var(--border)]/40 shadow-inner">
                            <PrintSettingsPanel />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}


// ─── Instagram Connect Panel ───────────────────────────────────────────────

function InstagramConnectPanel() {
  const { session, logout, patchSession } = useSession();
  const {
    startInstagramAuth,
    isLoading,
    error,
    notice,
  } = useInstagramOAuth({ session, patchSession, logout });

  const [deletingShopId, setDeletingShopId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [shopIdToDelete, setShopIdToDelete] = useState<string | null>(null);

  const shops = session.user?.shops ?? [];
  const isConnected = shops.length > 0;

  function handleDeleteShop(shopId: string) {
    setShopIdToDelete(shopId);
    setIsConfirmOpen(true);
  }

  async function onConfirmDelete() {
    if (!shopIdToDelete || deletingShopId) return;
    setIsConfirmOpen(false);

    const shopId = shopIdToDelete;
    setShopIdToDelete(null);
    setDeletingShopId(shopId);

    try {
      const res = await deleteShopFromBackend(session, shopId);
      if (res.ok) {
        const updatedShops = shops.filter((s) => s.id !== shopId);
        if (session.user) {
          patchSession({
            user: {
              ...session.user,
              shops: updatedShops,
            },
          });
        }
      } else {
        alert("Không thể xóa cửa hàng. Vui lòng thử lại sau.");
      }
    } catch (err) {
      console.error("Delete shop error:", err);
      alert("Đã xảy ra lỗi khi xóa cửa hàng.");
    } finally {
      setDeletingShopId(null);
    }
  }

  function onCancelDelete() {
    setIsConfirmOpen(false);
    setShopIdToDelete(null);
  }

  return (
    <Panel title="Instagram">
      <div className="space-y-4">
        {/* Danh sách các shop đã kết nối */}
        {isConnected ? (
          <div className="space-y-2.5">
            <p className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
              Cửa hàng đã kết nối ({shops.length})
            </p>
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {shops.map((shop) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div 
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 shadow-sm"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 text-sm font-bold text-white shadow-sm shrink-0">
                        {shop.avatar ? (
                          <img src={shop.avatar} alt={shop.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          shop.name[0]?.toUpperCase() || "S"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{shop.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-600 dark:text-pink-400 shrink-0">
                            Instagram
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--muted)] truncate">ID: {shop.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteShop(shop.id)}
                        disabled={deletingShopId !== null}
                        className="p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition disabled:opacity-50 shrink-0"
                        title="Xóa cửa hàng"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center">
            <InstagramIcon className="mx-auto h-8 w-8 text-[var(--muted)] opacity-50" />
            <p className="mt-2 text-xs text-[var(--foreground-soft)]">Chưa có tài khoản Instagram nào được kết nối.</p>
          </div>
        )}

        {/* Feedback */}
        {notice && (
          <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground-soft)]">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            id="instagram-auth-btn"
            type="button"
            onClick={() => void startInstagramAuth()}
            disabled={isLoading}
            className="w-full inline-flex h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
              boxShadow: "0 4px 12px rgba(220,39,67,0.2)",
            }}
          >
            <InstagramIcon className="h-4 w-4" color="white" />
            {isLoading
              ? "Đang xác thực..."
              : isConnected
                ? "Kết nối thêm tài khoản"
                : "Kết nối Instagram"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Xác nhận xóa cửa hàng"
        message="Bạn có chắc chắn muốn xóa cửa hàng này khỏi tài khoản của bạn không? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isDanger={true}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    </Panel>
  );
}

// Instagram icon SVG (not available in lucide-react)
function InstagramIcon({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
