/**
 * TagsPanel — Component to manage general system tags (CRUD with customized colors).
 */
"use client";

import React, { useState } from "react";
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from "@/hooks/use-tags";
import { Plus, Edit, Trash2, Check, RefreshCw, AlertCircle, Palette, Tag as TagIcon, X } from "lucide-react";
import { Panel, CONTROL_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { motion, AnimatePresence } from "framer-motion";
import { extractCollection } from "@/lib/proxy-client";

const DEFAULT_COLORS = [
  "#FF5733", // Đỏ cam
  "#33C3F0", // Xanh dương
  "#4CAF50", // Xanh lá
  "#FFC107", // Vàng
  "#9C27B0", // Tím
  "#FF4081", // Hồng
  "#808080", // Xám
  "#3B5BDB", // Xanh Indigo
  "#10B981", // Emerald
];

export function TagsPanel() {
  const { data: tagsData = [], isLoading, error } = useTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const tags = extractCollection(tagsData);

  // Form State
  const [editingTag, setEditingTag] = useState<any | null>(null); // null means creating, otherwise editing
  const [showForm, setShowForm] = useState(false);
  const [tagLabel, setTagLabel] = useState("");
  const [tagColor, setTagColor] = useState(DEFAULT_COLORS[0]);
  const [formError, setFormError] = useState("");

  const handleOpenCreate = () => {
    setEditingTag(null);
    setTagLabel("");
    setTagColor(DEFAULT_COLORS[0]);
    setFormError("");
    setShowForm(true);
  };

  const handleOpenEdit = (tag: any) => {
    setEditingTag(tag);
    setTagLabel(tag.label);
    setTagColor(tag.color || DEFAULT_COLORS[0]);
    setFormError("");
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!tagLabel.trim()) {
      setFormError("Vui lòng nhập tên nhãn.");
      return;
    }

    try {
      if (editingTag) {
        await updateMutation.mutateAsync({
          tagId: editingTag._id,
          body: {
            label: tagLabel.trim(),
            color: tagColor,
          }
        });
      } else {
        await createMutation.mutateAsync({
          label: tagLabel.trim(),
          color: tagColor,
        });
      }
      setShowForm(false);
      setTagLabel("");
    } catch (err: any) {
      setFormError(err.message || "Không thể lưu thông tin nhãn.");
    }
  };

  const handleDelete = async (tagId: string, label: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhãn "${label}"? Các khách hàng được gán nhãn này sẽ mất nhãn liên kết.`)) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(tagId);
    } catch (err: any) {
      alert(err.message || "Không thể xóa nhãn.");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Panel title="Danh mục Thẻ nhãn (Tags)">
      <div className="space-y-6">
        
        {/* Intro Banner */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/40 p-4 text-xs text-[var(--foreground-soft)] leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-[var(--primary)]">
            <TagIcon className="w-3.5 h-3.5" />
            Quản lý nhãn phân loại khách hàng:
          </p>
          <p>
            Tạo và cấu hình màu sắc cho các thẻ nhãn phân loại. Nhãn này dùng để gán nhanh cho khách hàng khi lọc đơn hàng, chốt đơn livestream và quản lý lịch sử mua hàng.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
            Danh sách nhãn ({tags.length})
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" />
            Tạo nhãn mới
          </button>
        </div>

        {/* Tags list */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
            Đang tải danh sách nhãn...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl">
            Lỗi tải dữ liệu: {error.message}
          </div>
        ) : tags.length === 0 ? (
          <div className="p-10 border border-dashed border-[var(--border)] rounded-xl text-center text-xs text-[var(--muted)]">
            Chưa có thẻ nhãn nào được tạo. Nhấp "Tạo nhãn mới" để bắt đầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <AnimatePresence initial={false}>
              {tags.map((tag: any) => (
                <motion.div
                  key={tag._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/20 shadow-sm hover:shadow-md hover:border-[var(--border-strong)] transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: tag.color || "#808080" }}
                    />
                    <span className="font-semibold text-xs text-[var(--foreground)] truncate">{tag.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(tag)}
                      className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition"
                      title="Sửa nhãn"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag._id, tag.label)}
                      className="p-1 rounded-lg text-[var(--muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                      title="Xóa nhãn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Dialog Form Form (Modal Popup) */}
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-bold text-sm text-[var(--foreground)]">
                  {editingTag ? "Chỉnh sửa Nhãn" : "Tạo Nhãn Mới"}
                </h3>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-1 rounded-lg text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSave} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl">
                    {formError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider">
                    Tên nhãn
                  </label>
                  <input
                    type="text"
                    value={tagLabel}
                    onChange={(e) => setTagLabel(e.target.value)}
                    className={CONTROL_CLASS}
                    placeholder="Ví dụ: Khách VIP, Boom hàng..."
                    maxLength={30}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Chọn màu sắc nhãn
                  </label>
                  
                  {/* Grid colors selection */}
                  <div className="flex flex-wrap gap-2.5 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30">
                    {DEFAULT_COLORS.map((color) => {
                      const isSelected = tagColor.toLowerCase() === color.toLowerCase();
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setTagColor(color)}
                          className="w-7 h-7 rounded-full relative flex items-center justify-center shadow-sm active:scale-90 transition-transform shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {isSelected && (
                            <Check className="w-4.5 h-4.5 text-white stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}

                    {/* Custom Hex Color Input */}
                    <div className="flex items-center gap-2 border-l border-[var(--border)] pl-2.5 w-full mt-2">
                      <span className="text-[10px] font-bold text-[var(--muted)] shrink-0">Custom Hex:</span>
                      <input
                        type="color"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className="w-6 h-6 border-none rounded cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={tagColor}
                        onChange={(e) => setTagColor(e.target.value)}
                        className={`${CONTROL_CLASS} h-7 w-20 px-1 text-[11px] font-mono`}
                        placeholder="#HEX"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/30">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={isPending}
                  className={`${SECONDARY_BUTTON_CLASS} h-9 px-4 text-xs font-semibold`}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className={`${PRIMARY_BUTTON_CLASS} h-9 px-4 text-xs font-bold flex items-center gap-1.5`}
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {editingTag ? "Cập nhật nhãn" : "Tạo nhãn"}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </Panel>
  );
}
