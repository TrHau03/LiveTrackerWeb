/**
 * ShopSettingsDialog — Modal component to edit shop phone, address and bank settings (VietQR).
 */
"use client";import React, { useState, useEffect, useMemo } from "react";
import { useBanks, useSaveBankSettings, useUpdateShopInfo } from "@/hooks/use-bank";
import { X, Search, Check, RefreshCw, Smartphone, MapPin, CreditCard, User, Landmark, ChevronDown } from "lucide-react";
import { CONTROL_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { motion, AnimatePresence } from "framer-motion";

interface ShopSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shop: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    bankCode?: string;
    bankAccount?: string;
    bankAccountName?: string;
  };
  onSuccess: () => void;
}

export function ShopSettingsDialog({ isOpen, onClose, shop, onSuccess }: ShopSettingsDialogProps) {
  const { data: banks = [], isLoading: isLoadingBanks } = useBanks();
  const saveBankMutation = useSaveBankSettings();
  const updateShopMutation = useUpdateShopInfo();

  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [selectedBankBin, setSelectedBankBin] = useState("");
  const [bankSearchText, setBankSearchText] = useState("");
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize fields on shop change
  useEffect(() => {
    if (shop) {
      setPhone(shop.phone || "");
      setAddress(shop.address || "");
      setAccountNo(shop.bankAccount || "");
      setAccountName(shop.bankAccountName || "");
      setSelectedBankBin(shop.bankCode || "");
      setErrorMsg("");
    }
  }, [shop, isOpen]);

  // Selected Bank info
  const selectedBank = useMemo(() => {
    return banks.find(b => b.bin === selectedBankBin) || null;
  }, [banks, selectedBankBin]);

  // Filter banks by search keyword
  const filteredBanks = useMemo(() => {
    if (!bankSearchText.trim()) return banks;
    const lower = bankSearchText.toLowerCase();
    return banks.filter(
      b => b.shortName.toLowerCase().includes(lower) || b.name.toLowerCase().includes(lower)
    );
  }, [banks, bankSearchText]);

  const isPending = saveBankMutation.isPending || updateShopMutation.isPending;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const hasBankInput = selectedBankBin || accountNo.trim() || accountName.trim();
    if (hasBankInput) {
      if (!selectedBankBin) {
        setErrorMsg("Vui lòng chọn ngân hàng.");
        return;
      }
      if (!accountNo.trim()) {
        setErrorMsg("Vui lòng nhập số tài khoản.");
        return;
      }
      if (!accountName.trim()) {
        setErrorMsg("Vui lòng nhập tên chủ tài khoản.");
        return;
      }
    }

    try {
      // 1. Update basic shop info (phone, address)
      await updateShopMutation.mutateAsync({
        shopId: shop.id,
        data: {
          phone: phone.trim(),
          address: address.trim()
        }
      });

      // 2. Update bank settings if bank info is provided
      if (hasBankInput) {
        await saveBankMutation.mutateAsync({
          shopId: shop.id,
          data: {
            bin: selectedBankBin,
            accountNo: accountNo.trim(),
            accountName: accountName.trim().toUpperCase()
          }
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Đã xảy ra lỗi khi lưu cấu hình.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="relative w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4.5 border-b border-[var(--border)]">
          <div>
            <h3 className="font-bold text-base text-[var(--foreground)]">Thiết lập Cửa hàng</h3>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 font-medium">Cấu hình thông tin liên hệ và cổng VietQR cho {shop.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-colors duration-150"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 p-5 space-y-5 overflow-y-auto max-h-[70vh] custom-scrollbar-premium">
          
          {errorMsg && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-medium animate-in fade-in slide-in-from-top-1">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Shop Information */}
          <div className="bg-[var(--surface-muted)]/20 border border-[var(--border)]/40 rounded-2xl p-4.5 space-y-4">
            <h4 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Thông tin liên hệ cửa hàng</h4>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] flex items-center gap-2 select-none">
                  <Smartphone className="w-3.5 h-3.5 text-[var(--primary)]/70" />
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)]/50 outline-none transition-all duration-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                  placeholder="Nhập số điện thoại liên hệ"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] flex items-center gap-2 select-none">
                  <MapPin className="w-3.5 h-3.5 text-[var(--primary)]/70" />
                  Địa chỉ shop
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)]/50 outline-none transition-all duration-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 resize-none h-20"
                  placeholder="Nhập địa chỉ của cửa hàng để in hóa đơn"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Section 2: VietQR Bank Account settings */}
          <div className="bg-[var(--surface-muted)]/20 border border-[var(--border)]/40 rounded-2xl p-4.5 space-y-4">
            <h4 className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Tài khoản Ngân hàng (VietQR)</h4>
            
            <div className="space-y-4">
              {/* Bank Selector */}
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] flex items-center gap-2 select-none">
                  <Landmark className="w-3.5 h-3.5 text-[var(--primary)]/70" />
                  Chọn Ngân hàng
                </label>
                
                <button
                  type="button"
                  onClick={() => setShowBankDropdown(!showBankDropdown)}
                  className="w-full flex items-center justify-between h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-[var(--foreground)] outline-none transition-all duration-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 text-left"
                >
                  {selectedBank ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-6 w-10 bg-white rounded border border-[var(--border)]/40 p-0.5 flex items-center justify-center shrink-0">
                        <img src={selectedBank.logo} alt={selectedBank.shortName} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-[var(--foreground)] shrink-0">{selectedBank.shortName}</span>
                        <span className="text-[10px] text-[var(--muted)] truncate">({selectedBank.name})</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">-- Chọn ngân hàng thụ hưởng --</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-[var(--muted)] transition-transform duration-200 shrink-0 ${showBankDropdown ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown List */}
                <AnimatePresence>
                  {showBankDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-60"
                    >
                      <div className="p-2.5 border-b border-[var(--border)] bg-[var(--surface-muted)]/50 sticky top-0 flex items-center gap-2">
                        <Search className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm ngân hàng nhanh..."
                          value={bankSearchText}
                          onChange={(e) => setBankSearchText(e.target.value)}
                          className="w-full bg-transparent border-none outline-none text-xs p-1 text-[var(--foreground)] placeholder-[var(--muted)]/60"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar-premium divide-y divide-[var(--border)]/40 max-h-48">
                        {isLoadingBanks ? (
                          <div className="p-4 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Đang tải danh sách ngân hàng...
                          </div>
                        ) : filteredBanks.length === 0 ? (
                          <div className="p-4 text-center text-xs text-[var(--muted)]">
                            Không tìm thấy ngân hàng nào.
                          </div>
                        ) : (
                          filteredBanks.map((bank) => (
                            <button
                              key={bank.bin}
                              type="button"
                              onClick={() => {
                                setSelectedBankBin(bank.bin);
                                setShowBankDropdown(false);
                                setBankSearchText("");
                              }}
                              className="w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-[var(--hover)] transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-6 w-10 bg-white rounded border border-[var(--border)]/30 p-0.5 flex items-center justify-center shrink-0">
                                  <img src={bank.logo} alt={bank.shortName} className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="min-w-0">
                                  <span className="block font-bold text-xs text-[var(--foreground)]">{bank.shortName}</span>
                                  <span className="block text-[9px] text-[var(--muted)] truncate">{bank.name}</span>
                                </div>
                              </div>
                              {selectedBankBin === bank.bin && (
                                <Check className="w-4 h-4 text-[var(--primary)] shrink-0" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Account Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] flex items-center gap-2 select-none">
                  <CreditCard className="w-3.5 h-3.5 text-[var(--primary)]/70" />
                  Số tài khoản
                </label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)]/50 outline-none transition-all duration-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                  placeholder="Nhập số tài khoản ngân hàng"
                />
              </div>

              {/* Account Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] flex items-center gap-2 select-none">
                  <User className="w-3.5 h-3.5 text-[var(--primary)]/70" />
                  Tên chủ tài khoản
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  className="w-full h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs text-[var(--foreground)] placeholder-[var(--muted)]/50 outline-none transition-all duration-200 focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10"
                  placeholder="Nhập tên không dấu (ví dụ: NGUYEN VAN A)"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/30">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-all active:scale-95 duration-150 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="h-10 px-5 rounded-xl bg-[var(--accent-green)] hover:bg-[var(--accent-green-strong)] text-xs font-bold text-white shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all active:scale-95 duration-150 flex items-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Lưu cấu hình
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
