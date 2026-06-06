"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useSession } from "@/components/session-provider";
import { proxyRequest } from "@/lib/proxy-client";
import { Panel, CONTROL_CLASS } from "@/components/ui/workspace-shared";
import { 
  MessageSquare, 
  Plus, 
  X, 
  Upload, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw 
} from "lucide-react";

type SubTabType = "order" | "comment" | "backup" | "error" | "newCustomer";

interface TemplateItem {
  content: string;
  isActive: boolean;
}

const VARIABLES_CONFIG = {
  order: [
    { key: "Ten_Khach_Hang", label: "Tên khách", desc: "Tên tài khoản Instagram của khách" },
    { key: "Ma_Don_Hang", label: "Mã đơn", desc: "Mã đơn hàng được chốt" },
    { key: "So_Luong", label: "Số lượng", desc: "Tổng số lượng sản phẩm" },
    { key: "Tong_Tien", label: "Tổng tiền", desc: "Tổng tiền cần thanh toán" },
  ],
  comment: [
    { key: "Ten_Khach_Hang", label: "Tên khách", desc: "Tên tài khoản Instagram của khách" },
    { key: "Noi_Dung_Binh_Luan", label: "Bình luận gốc", desc: "Nội dung bình luận chốt đơn" },
    { key: "So_Luong_San_Pham", label: "Số lượng", desc: "Số lượng sản phẩm parse được" },
    { key: "Don_Gia_San_Pham", label: "Đơn giá", desc: "Giá sản phẩm parse được" },
    { key: "Thoi_Gian_Binh_Luan", label: "Thời gian", desc: "Thời gian khách bình luận" },
  ],
  backup: [
    { key: "Ten_Khach_Hang", label: "Tên khách", desc: "Tên tài khoản Instagram của khách" },
  ],
  error: [
    { key: "Ten_Khach_Hang", label: "Tên khách", desc: "Tên tài khoản Instagram của khách" },
  ],
  newCustomer: [
    { key: "Ten_Khach_Hang", label: "Tên khách", desc: "Tên tài khoản Instagram của khách" },
  ],
};

export function MessageTemplatePanel() {
  const { session, refreshUser } = useSession();
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>("order");
  
  // Modal & Form State
  const [editingTemplate, setEditingTemplate] = useState<{
    content: string;
    isActive: boolean;
    index: number | null;
  } | null>(null);
  const [cursorPos, setCursorPos] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper to get normalized templates
  const getTemplates = useCallback((type: SubTabType): TemplateItem[] => {
    const templates = session.user?.messageTemplate;
    if (!templates) return [];

    if (type === "order") {
      const orderData = templates.order;
      if (!orderData) return [];
      if (Array.isArray(orderData)) return orderData as TemplateItem[];
      if (Array.isArray(orderData.template)) return orderData.template as TemplateItem[];
      return [];
    }

    const list = templates[type];
    return Array.isArray(list) ? (list as TemplateItem[]) : [];
  }, [session.user?.messageTemplate]);

  const orderImage = useMemo(() => {
    const templates = session.user?.messageTemplate;
    if (templates && !Array.isArray(templates) && templates.order) {
      const orderData = templates.order;
      if (orderData && typeof orderData === "object" && "image" in orderData) {
        return (orderData as any).image as string || null;
      }
    }
    return null;
  }, [session.user?.messageTemplate]);

  const handleToggleActive = async (index: number, currentActive: boolean) => {
    try {
      const currentTemplates = JSON.parse(JSON.stringify(session.user?.messageTemplate || {}));
      let list = [...getTemplates(activeSubTab)];

      if (activeSubTab === "order") {
        list[index] = { ...list[index], isActive: !currentActive };
      } else {
        const nextActive = !currentActive;
        list = list.map((item, i) => ({
          ...item,
          isActive: i === index ? nextActive : false,
        }));
      }

      const payload = {
        messageTemplate: {
          ...currentTemplates,
        },
      };

      if (activeSubTab === "order") {
        payload.messageTemplate.order = {
          template: list,
          image: currentTemplates.order?.image || null,
        };
      } else {
        payload.messageTemplate[activeSubTab] = list;
      }

      const res = await proxyRequest<any>(session, {
        path: "/users/me/message-template",
        method: "PATCH",
        body: payload,
      });

      if (res.ok) {
        await refreshUser();
      } else {
        alert(res.data?.message || "Không thể cập nhật trạng thái hoạt động của mẫu.");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + (e.message || e));
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !editingTemplate.content.trim()) {
      alert("Vui lòng nhập nội dung mẫu tin nhắn.");
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const currentTemplates = JSON.parse(JSON.stringify(session.user?.messageTemplate || {}));
      let list = [...getTemplates(activeSubTab)];

      // Limit to 2 templates for Orders
      if (editingTemplate.index === null && activeSubTab === "order" && list.length >= 2) {
        alert("Chỉ được tạo tối đa 2 mẫu phản hồi cho đơn hàng!");
        setIsSaving(false);
        return;
      }

      if (editingTemplate.isActive && activeSubTab !== "order") {
        list = list.map((item) => ({ ...item, isActive: false }));
      }

      const newItem = {
        content: editingTemplate.content.trim(),
        isActive: editingTemplate.isActive,
      };

      if (editingTemplate.index !== null) {
        list[editingTemplate.index] = newItem;
      } else {
        list.push(newItem);
      }

      const payload = {
        messageTemplate: {
          ...currentTemplates,
        },
      };

      if (activeSubTab === "order") {
        payload.messageTemplate.order = {
          template: list,
          image: currentTemplates.order?.image || null,
        };
      } else {
        payload.messageTemplate[activeSubTab] = list;
      }

      const res = await proxyRequest<any>(session, {
        path: "/users/me/message-template",
        method: "PATCH",
        body: payload,
      });

      if (res.ok) {
        await refreshUser();
        setEditingTemplate(null);
        setFeedbackMsg({
          type: "success",
          text: editingTemplate.index !== null ? "Đã cập nhật mẫu phản hồi thành công!" : "Đã thêm mẫu phản hồi mới thành công!",
        });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert(res.data?.message || "Không thể lưu mẫu tin nhắn.");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (index: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu phản hồi này không? Hành động này không thể hoàn tác.")) return;

    try {
      const currentTemplates = JSON.parse(JSON.stringify(session.user?.messageTemplate || {}));
      const list = getTemplates(activeSubTab).filter((_, i) => i !== index);

      const payload = {
        messageTemplate: {
          ...currentTemplates,
        },
      };

      if (activeSubTab === "order") {
        payload.messageTemplate.order = {
          template: list,
          image: currentTemplates.order?.image || null,
        };
      } else {
        payload.messageTemplate[activeSubTab] = list;
      }

      const res = await proxyRequest<any>(session, {
        path: "/users/me/message-template",
        method: "PATCH",
        body: payload,
      });

      if (res.ok) {
        await refreshUser();
        setFeedbackMsg({ type: "success", text: "Đã xóa mẫu phản hồi thành công!" });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert(res.data?.message || "Không thể xóa mẫu phản hồi.");
      }
    } catch (e: any) {
      alert("Lỗi kết nối: " + (e.message || e));
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Dung lượng file tối đa là 5MB!");
      return;
    }

    setIsUploading(true);
    setFeedbackMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (orderImage) {
        formData.append("oldImageUrl", orderImage);
      }

      const res = await proxyRequest<any>(session, {
        path: "/users/me/message-template/images?templateType=order1",
        method: "POST",
        body: formData,
        bodyMode: "form-data",
      });

      if (res.ok && res.data?.success) {
        const newImageUrl = res.data.data;
        const currentTemplates = JSON.parse(JSON.stringify(session.user?.messageTemplate || {}));
        const orderTemplates = getTemplates("order");

        const payload = {
          messageTemplate: {
            ...currentTemplates,
            order: {
              template: orderTemplates,
              image: newImageUrl,
            },
          },
        };

        const saveRes = await proxyRequest<any>(session, {
          path: "/users/me/message-template",
          method: "PATCH",
          body: payload,
        });

        if (saveRes.ok) {
          await refreshUser();
          setFeedbackMsg({ type: "success", text: "Đã tải lên và lưu ảnh đính kèm thành công!" });
          setTimeout(() => setFeedbackMsg(null), 4000);
        } else {
          alert("Không thể lưu cấu hình ảnh mới.");
        }
      } else {
        alert(res.data?.message || "Tải lên hình ảnh thất bại.");
      }
    } catch (e: any) {
      alert("Lỗi upload: " + (e.message || e));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!confirm("Bạn có chắc muốn xóa ảnh đính kèm chung của đơn hàng?")) return;

    setIsUploading(true);
    try {
      const currentTemplates = JSON.parse(JSON.stringify(session.user?.messageTemplate || {}));
      const orderTemplates = getTemplates("order");

      const payload = {
        messageTemplate: {
          ...currentTemplates,
          order: {
            template: orderTemplates,
            image: null,
          },
        },
      };

      const saveRes = await proxyRequest<any>(session, {
        path: "/users/me/message-template",
        method: "PATCH",
        body: payload,
      });

      if (saveRes.ok) {
        await refreshUser();
        setFeedbackMsg({ type: "success", text: "Đã xóa ảnh đính kèm thành công!" });
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        alert("Không thể xóa ảnh.");
      }
    } catch (e: any) {
      alert("Lỗi xóa ảnh: " + (e.message || e));
    } finally {
      setIsUploading(false);
    }
  };

  const insertVariable = (variableKey: string) => {
    const textarea = document.getElementById("template-textarea") as HTMLTextAreaElement;
    if (!textarea || !editingTemplate) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newVal = before + `{{${variableKey}}}` + after;

    setEditingTemplate({
      ...editingTemplate,
      content: newVal,
    });

    const newPos = start + `{{${variableKey}}}`.length;
    setCursorPos(newPos);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const subTabs = [
    { id: "order", label: "Đơn hàng" },
    { id: "comment", label: "Bình luận" },
    { id: "backup", label: "Dự bị" },
    { id: "error", label: "Sản phẩm lỗi" },
    { id: "newCustomer", label: "Khách mới" },
  ];

  const currentTemplates = getTemplates(activeSubTab);
  const currentVariables = VARIABLES_CONFIG[activeSubTab];

  return (
    <Panel title="Mẫu tin nhắn tự động">
      <div className="space-y-6">
        
        {/* Quick Guide */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4 text-xs text-[var(--foreground-soft)] leading-relaxed space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-[var(--primary)]">
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            Hướng dẫn kịch bản tin nhắn tự động:
          </p>
          <p>
            Hệ thống hỗ trợ gửi tin nhắn tự động thông qua Chatbot tích hợp khi phát sinh các sự kiện tương tác tương ứng. Bạn có thể soạn nội dung phản hồi nhanh và chèn các biến động. Biến động dạng <code className="bg-[var(--surface)] px-1 rounded font-mono font-bold text-[var(--primary)]">{"{{Key}}"}</code> sẽ được hệ thống điền dữ liệu thật tương ứng lúc gửi tin.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-[var(--border)]">
          {subTabs.map((subTab) => {
            const isActive = activeSubTab === subTab.id;
            return (
              <button
                key={subTab.id}
                type="button"
                onClick={() => setActiveSubTab(subTab.id as SubTabType)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition border whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/30 font-bold"
                    : "bg-[var(--surface)] text-[var(--muted)] border-transparent hover:bg-[var(--hover)]"
                }`}
              >
                {subTab.label}
              </button>
            );
          })}
        </div>

        {/* Feedback Alert inside panel */}
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

        {/* Tab-specific options: Upload image for Order */}
        {activeSubTab === "order" && (
          <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)] space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">Hình ảnh đính kèm chung cho Đơn hàng</p>
                <p className="text-[10px] text-[var(--muted)] mt-1">Ảnh này sẽ tự động đính kèm gửi cùng tin nhắn chốt đơn cho khách hàng.</p>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {isUploading ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
                    Đang tải lên...
                  </span>
                ) : (
                  <>
                    <label className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--hover)] hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer shadow-sm">
                      <Upload className="w-3.5 h-3.5" />
                      {orderImage ? "Thay đổi ảnh" : "Tải ảnh lên"}
                      <input type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                    </label>
                    {orderImage && (
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 px-3 py-1.5 text-xs font-semibold hover:bg-red-100 transition shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa ảnh
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {orderImage && (
              <div className="relative w-36 h-24 rounded-lg overflow-hidden border border-[var(--border)]/60 bg-[var(--surface-muted)] group">
                <img src={orderImage} alt="Order Template" className="w-full h-full object-cover" />
                <a 
                  href={orderImage} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition-opacity"
                >
                  Xem ảnh lớn
                </a>
              </div>
            )}
          </div>
        )}

        {/* Add Template Button */}
        {editingTemplate === null && (
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
              Danh sách mẫu ({currentTemplates.length})
            </p>
            {!(activeSubTab === "order" && currentTemplates.length >= 2) && (
              <button
                type="button"
                onClick={() => setEditingTemplate({ content: "", isActive: currentTemplates.length === 0, index: null })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm mẫu
              </button>
            )}
          </div>
        )}

        {/* Editor form */}
        {editingTemplate !== null && (
          <div className="rounded-xl border-2 border-[var(--primary)]/30 p-5 bg-[var(--surface)] space-y-4 shadow-md animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h4 className="font-bold text-sm text-[var(--foreground)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
                {editingTemplate.index !== null ? "Chỉnh sửa mẫu tin nhắn" : "Thêm mẫu tin nhắn mới"}
              </h4>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick variable insertion */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Chèn biến nhanh:</label>
              <div className="flex flex-wrap gap-2">
                {currentVariables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-soft)] transition select-none"
                    title={v.desc}
                  >
                    <span className="font-mono text-[var(--primary)] font-bold">{"{{"}{v.label}{"}}"}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea and Activation switch */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Nội dung mẫu phản hồi:</label>
                <textarea
                  id="template-textarea"
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  onSelect={(e: any) => setCursorPos(e.target.selectionStart)}
                  rows={4}
                  className={`${CONTROL_CLASS} w-full text-sm font-medium leading-relaxed resize-y`}
                  placeholder="Ví dụ: Chào {{Ten_Khach_Hang}}! Đơn hàng {{Ma_Don_Hang}} của bạn..."
                />
              </div>

              <div className="flex items-center justify-between bg-[var(--surface-muted)]/30 rounded-xl p-3 border border-[var(--border)]/60">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--foreground)]">Kích hoạt mẫu này</p>
                  <p className="text-[10px] text-[var(--muted)] leading-tight">
                    {activeSubTab === "order" 
                      ? "Bật hoặc tắt mẫu này. (Tối đa kích hoạt cả 2 mẫu cho Đơn hàng)"
                      : "Khi bật, kịch bản này sẽ hoạt động và tự động tắt các kịch bản khác."}
                  </p>
                </div>
                <label 
                  className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)] focus-within:ring-offset-2" 
                  style={{ backgroundColor: editingTemplate.isActive ? 'var(--primary)' : 'var(--surface-muted)' }}
                >
                  <input 
                    type="checkbox" 
                    checked={editingTemplate.isActive} 
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.checked })} 
                    className="peer sr-only" 
                  />
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${editingTemplate.isActive ? 'translate-x-[10px]' : '-translate-x-[10px]'}`} />
                </label>
              </div>
            </div>

            {/* Form actions */}
            <div className="flex items-center gap-2.5 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSaving}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-600 disabled:opacity-50 transition"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Lưu kịch bản
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                disabled={isSaving}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-white dark:bg-[var(--surface)] hover:bg-[var(--hover)] px-4 text-xs font-semibold text-[var(--foreground)] disabled:opacity-50 transition"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        )}

        {/* Templates list */}
        <div className="space-y-3.5">
          {currentTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center bg-[var(--surface)] shadow-inner">
              <MessageSquare className="mx-auto h-8 w-8 text-[var(--muted)] opacity-40" />
              <p className="mt-2 text-xs text-[var(--foreground-soft)] font-medium">Chưa cấu hình mẫu tin nhắn nào.</p>
              <p className="text-[10px] text-[var(--muted)] mt-1">Nhấp vào "Thêm mẫu" để thiết lập kịch bản đầu tiên.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {currentTemplates.map((template, index) => {
                if (!template) return null;
                
                // Highlight variables {{...}}
                const renderHighlightedContent = (text: string) => {
                  if (!text) return "Nội dung mẫu phản hồi trống";
                  const parts = text.split(/(\{\{\w+\}\})/g);
                  return parts.map((part, i) => {
                    if (part.startsWith("{{") && part.endsWith("}}")) {
                      const cleanVar = part.replace("{{", "").replace("}}", "");
                      const variableMeta = currentVariables.find((v) => v.key === cleanVar);
                      return (
                        <span 
                          key={i} 
                          className="mx-0.5 px-1.5 py-0.5 rounded-md font-mono text-[11px] font-black bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary)]/10 shadow-sm"
                          title={variableMeta?.desc || cleanVar}
                        >
                          {variableMeta?.label || cleanVar}
                        </span>
                      );
                    }
                    return <span key={i}>{part}</span>;
                  });
                };

                return (
                  <div 
                    key={index}
                    className={`rounded-xl border p-4 bg-[var(--surface)] shadow-sm flex items-start gap-4 transition duration-300 relative overflow-hidden group ${
                      template.isActive 
                        ? "border-[var(--primary)]/40 shadow-[0_4px_16px_rgba(59,130,246,0.06)]" 
                        : "border-[var(--border)] hover:border-[var(--muted)]/40"
                    }`}
                  >
                    {/* Active State Switch */}
                    <div className="pt-0.5 shrink-0 select-none">
                      <label 
                        className="relative flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out" 
                        style={{ backgroundColor: template.isActive ? 'var(--primary)' : 'var(--surface-muted)' }}
                      >
                        <input 
                          type="checkbox" 
                          checked={template.isActive} 
                          onChange={() => void handleToggleActive(index, template.isActive)} 
                          className="peer sr-only" 
                        />
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${template.isActive ? 'translate-x-[8px]' : '-translate-x-[8px]'}`} />
                      </label>
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          template.isActive 
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/10" 
                            : "bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]"
                        }`}>
                          {template.isActive ? "Đang chạy" : "Tạm dừng"}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--muted)] uppercase font-semibold tracking-wider">
                          Mẫu #{index + 1}
                        </span>
                      </div>
                      
                      <p className="text-xs text-[var(--foreground)] font-medium leading-relaxed">
                        {renderHighlightedContent(template.content)}
                      </p>
                    </div>

                    {/* Action buttons (Edit / Delete) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingTemplate({ content: template.content, isActive: template.isActive, index })}
                        className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition shrink-0"
                        title="Chỉnh sửa mẫu"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTemplate(index)}
                        className="p-2 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition shrink-0"
                        title="Xóa mẫu phản hồi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </Panel>
  );
}
