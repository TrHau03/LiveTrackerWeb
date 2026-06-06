"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  useDeliveryProviders, 
  useProviderConfig, 
  useUpsertProviderConfig, 
  useRegisterGhnShop, 
  useGhnProvinces, 
  useGhnWards 
} from "@/hooks/use-delivery";
import { Panel, CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { Truck, Check, ShieldAlert, RefreshCw, Save, Plus, ChevronRight, Settings, Eye, EyeOff, Key, Lock, User, Globe, ChevronDown } from "lucide-react";

const getBrandStyles = (provider: string, isSelected: boolean) => {
  switch (provider) {
    case "jt-express":
      return {
        bgSelected: "bg-[var(--surface)] border-red-500 shadow-[0_4px_20px_rgba(239,68,68,0.1)] ring-2 ring-red-500/30",
        iconBg: isSelected ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-[var(--surface)] text-[var(--muted)]",
        badgeColor: "bg-red-500",
        hoverBorder: "hover:border-red-500/30",
        accentColor: "text-red-500"
      };
    case "ghn":
      return {
        bgSelected: "bg-[var(--surface)] border-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.1)] ring-2 ring-orange-500/30",
        iconBg: isSelected ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "bg-[var(--surface)] text-[var(--muted)]",
        badgeColor: "bg-orange-500",
        hoverBorder: "hover:border-orange-500/30",
        accentColor: "text-orange-500"
      };
    case "ghtk":
    default:
      return {
        bgSelected: "bg-[var(--surface)] border-emerald-500 shadow-[0_4px_20px_rgba(16,185,129,0.1)] ring-2 ring-emerald-500/30",
        iconBg: isSelected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-[var(--surface)] text-[var(--muted)]",
        badgeColor: "bg-emerald-500",
        hoverBorder: "hover:border-emerald-500/30",
        accentColor: "text-emerald-500"
      };
  }
};

export function DeliveryConfigPanel() {
  const { data: providers = [], isLoading: loadingProviders, refetch: refetchProviders } = useDeliveryProviders();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Panel title="Đơn vị vận chuyển">
        <p className="text-xs text-[var(--muted)] -mt-2 mb-4 leading-normal">
          Cấu hình tài khoản API của các đơn vị vận chuyển để tự động tính phí vận chuyển, tạo đơn giao hàng và theo dõi hành trình vận đơn.
        </p>

        {loadingProviders ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.provider;
              const brand = getBrandStyles(p.provider, isSelected);
              return (
                <button
                  key={p.provider}
                  type="button"
                  onClick={() => setSelectedProvider(isSelected ? null : p.provider)}
                  className={`flex flex-col p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden select-none group ${
                    isSelected
                      ? brand.bgSelected
                      : `bg-[var(--surface-muted)]/40 border-[var(--border)] hover:bg-[var(--surface-muted)]/80 ${brand.hoverBorder}`
                  }`}
                >
                  <div className="flex items-center gap-3.5 w-full">
                    <div className={`p-2.5 rounded-xl transition-colors duration-300 ${brand.iconBg}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <span className="block text-sm font-bold text-[var(--foreground)]">{p.displayName || p.provider}</span>
                      <span className="block text-[11px] text-[var(--muted)] mt-1.5 truncate">
                        {p.provider === "jt-express" ? "J&T Express Logistics" : p.provider === "ghn" ? "Giao Hàng Nhanh" : "Giao Hàng Tiết Kiệm"}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className={`absolute right-3 top-3 h-5 w-5 rounded-full text-white flex items-center justify-center shadow-md ${brand.badgeColor}`}>
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4">
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 border border-green-500/10">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border border-[var(--border)]">
                        Inactive
                      </span>
                    )}

                    {p.configured ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)] border border-blue-500/10">
                        Đã cấu hình
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 border border-amber-500/10">
                        Chưa cấu hình
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      {selectedProvider && (
        <div>
          <ProviderConfigForm 
            provider={selectedProvider} 
            displayName={providers.find((p) => p.provider === selectedProvider)?.displayName || selectedProvider}
            onSaveSuccess={() => {
              refetchProviders();
            }}
          />
        </div>
      )}
    </div>
  );
}

interface ProviderConfigFormProps {
  provider: string;
  displayName: string;
  onSaveSuccess: () => void;
}

function ProviderConfigForm({ provider, displayName, onSaveSuccess }: ProviderConfigFormProps) {
  const { data: config, isLoading: loadingConfig, refetch: refetchConfig } = useProviderConfig(provider);
  const upsertConfig = useUpsertProviderConfig();
  
  const [form, setForm] = useState({
    apiAccount: "",
    privateKey: "",
    customerCode: "",
    customerKey: "",
    password: "",
    token: "",
    shopId: "",
    partnerCode: "",
    referToken: "",
    baseUrl: "",
    isActive: true,
  });

  const [showGhnRegister, setShowGhnRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showCustomerKey, setShowCustomerKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showReferToken, setShowReferToken] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        apiAccount: config.apiAccount || "",
        privateKey: "", // Không hiển thị private key đã lưu
        customerCode: config.customerCode || "",
        customerKey: "", // Không hiển thị key
        password: "", // Không hiển thị password
        token: "", // Không hiển thị token
        shopId: config.shopId || "",
        partnerCode: config.partnerCode || "",
        referToken: "",
        baseUrl: config.baseUrl || "",
        isActive: config.isActive ?? true,
      });
    } else {
      setForm({
        apiAccount: "",
        privateKey: "",
        customerCode: "",
        customerKey: "",
        password: "",
        token: "",
        shopId: "",
        partnerCode: "",
        referToken: "",
        baseUrl: "",
        isActive: true,
      });
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowGhnRegister(false);
    setShowPrivateKey(false);
    setShowCustomerKey(false);
    setShowPassword(false);
    setShowToken(false);
    setShowReferToken(false);
  }, [config, provider]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload: any = {
      isActive: form.isActive,
      baseUrl: form.baseUrl.trim() || undefined,
    };

    if (provider === "jt-express") {
      if (!form.apiAccount.trim()) {
        setErrorMsg("Vui lòng điền API Account");
        return;
      }
      payload.apiAccount = form.apiAccount.trim();
      payload.customerCode = form.customerCode.trim() || undefined;
      
      if (form.privateKey.trim()) payload.privateKey = form.privateKey.trim();
      if (form.customerKey.trim()) payload.customerKey = form.customerKey.trim();
      if (form.password.trim()) payload.password = form.password.trim();
    } else if (provider === "ghn") {
      if (form.token.trim()) payload.token = form.token.trim();
      payload.shopId = form.shopId.trim() || undefined;
    } else if (provider === "ghtk") {
      payload.partnerCode = form.partnerCode.trim() || undefined;
      if (form.token.trim()) payload.token = form.token.trim();
      if (form.referToken.trim()) payload.referToken = form.referToken.trim();
    }

    try {
      await upsertConfig.mutateAsync({ provider, body: payload });
      setSuccessMsg(`Đã lưu cấu hình ${displayName} thành công!`);
      refetchConfig();
      onSaveSuccess();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể lưu cấu hình.");
    }
  };

  if (loadingConfig) {
    return (
      <Panel title={`Cấu hình ${displayName}`}>
        <div className="flex justify-center items-center py-6">
          <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title={`Cấu hình ${displayName}`}>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/10">
          <div>
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Trạng thái hoạt động</h4>
            <p className="text-[11px] text-[var(--muted)] mt-1">Bật/tắt đơn vị vận chuyển này trên hệ thống tạo đơn.</p>
          </div>
          <label 
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-within:ring-2 focus-within:ring-[var(--primary)]/30 ${
              form.isActive ? "bg-[var(--primary)]" : "bg-[var(--border)]"
            }`}
          >
            <input 
              type="checkbox" 
              checked={form.isActive} 
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
              className="sr-only" 
            />
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
          </label>
        </div>

        {provider === "jt-express" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>API Account <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                value={form.apiAccount}
                onChange={(e) => setForm({ ...form, apiAccount: e.target.value })}
                className={CONTROL_CLASS}
                placeholder="Nhập tài khoản API do J&T cấp"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" />
                <span>Mã khách hàng (Customer Code)</span>
              </label>
              <input
                type="text"
                value={form.customerCode}
                onChange={(e) => setForm({ ...form, customerCode: e.target.value })}
                className={CONTROL_CLASS}
                placeholder="Mã khách hàng VIP (ví dụ: J008...)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-red-500" />
                <span>Private Key (HMAC Digest)</span>
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? "text" : "password"}
                  value={form.privateKey}
                  onChange={(e) => setForm({ ...form, privateKey: e.target.value })}
                  className={`${CONTROL_CLASS} w-full pr-10`}
                  placeholder={config?.hasPrivateKey ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Nhập Private Key chữ ký số"}
                />
                <button
                  type="button"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-red-500" />
                <span>Customer Key (Để tự sinh Password)</span>
              </label>
              <div className="relative">
                <input
                  type={showCustomerKey ? "text" : "password"}
                  value={form.customerKey}
                  onChange={(e) => setForm({ ...form, customerKey: e.target.value })}
                  className={`${CONTROL_CLASS} w-full pr-10`}
                  placeholder={config?.hasCustomerKey ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Nhập Customer Key để hash mật khẩu"}
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerKey(!showCustomerKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showCustomerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-500" />
                <span>Mật khẩu API J&T (Nếu nhập thẳng)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`${CONTROL_CLASS} w-full pr-10`}
                  placeholder={config?.hasPassword ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Nhập mật khẩu MD5 hoặc plaintext (BE sẽ tự hash)"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {provider === "ghn" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-orange-500" />
                  <span>Token GHN <span className="text-red-500">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={form.token}
                    onChange={(e) => setForm({ ...form, token: e.target.value })}
                    className={`${CONTROL_CLASS} w-full pr-10`}
                    placeholder={config?.hasToken ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Nhập mã token API GHN của bạn"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-orange-500" />
                  <span>Mã Shop ID GHN <span className="text-red-500">*</span></span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.shopId}
                    onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                    className={CONTROL_CLASS}
                    placeholder="Mã cửa hàng GHN (ví dụ: 81558)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGhnRegister(!showGhnRegister)}
                    className={`${SECONDARY_BUTTON_CLASS} shrink-0 px-3.5 flex items-center gap-1.5 hover:border-orange-500/30 hover:bg-orange-500/5`}
                  >
                    <Plus className="w-4 h-4 text-orange-500" />
                    Đăng ký shop
                  </button>
                </div>
              </div>
            </div>

            {showGhnRegister && (
              <div className="border border-dashed border-orange-500/30 rounded-xl p-4 bg-orange-500/5 dark:bg-orange-500/5 shadow-inner">
                <GhnShopRegisterForm 
                  ghnToken={form.token || undefined}
                  onRegistered={(newShopId) => {
                    setForm((f) => ({ ...f, shopId: newShopId }));
                    setShowGhnRegister(false);
                  }}
                />
              </div>
            )}
          </div>
        )}

        {provider === "ghtk" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mã khách hàng GHTK (Partner Code)</span>
              </label>
              <input
                type="text"
                value={form.partnerCode}
                onChange={(e) => setForm({ ...form, partnerCode: e.target.value })}
                className={CONTROL_CLASS}
                placeholder="Mã đối tác (ví dụ: GHTK...)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-500" />
                <span>API Token GHTK <span className="text-red-500">*</span></span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  className={`${CONTROL_CLASS} w-full pr-10`}
                  placeholder={config?.hasToken ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Token bảo mật API GHTK"}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mã giới thiệu (Refer Token)</span>
              </label>
              <div className="relative">
                <input
                  type={showReferToken ? "text" : "password"}
                  value={form.referToken}
                  onChange={(e) => setForm({ ...form, referToken: e.target.value })}
                  className={`${CONTROL_CLASS} w-full pr-10`}
                  placeholder={config?.hasReferToken ? "•••••••••••••••• (Đã cấu hình, điền để đổi)" : "Mã giới thiệu của bạn (nếu có)"}
                />
                <button
                  type="button"
                  onClick={() => setShowReferToken(!showReferToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
                >
                  {showReferToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--foreground-soft)] uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Custom Base URL (Tùy chọn)</span>
          </label>
          <input
            type="text"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            className={CONTROL_CLASS}
            placeholder="Nếu muốn đổi URL kết nối API Sandbox/Production"
          />
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/10 dark:border-red-900/30 p-3 text-xs text-red-600 flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/10 dark:border-green-900/30 p-3 text-xs text-green-600 flex items-start gap-2.5">
            <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={upsertConfig.isPending}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-md hover:bg-blue-600 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
          >
            {upsertConfig.isPending ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Lưu cấu hình
          </button>
        </div>
      </form>
    </Panel>
  );
}

interface GhnShopRegisterFormProps {
  ghnToken?: string;
  onRegistered: (shopId: string) => void;
}

function GhnShopRegisterForm({ ghnToken, onRegistered }: GhnShopRegisterFormProps) {
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [address, setAddress] = useState("");
  
  const [provinceId, setProvinceId] = useState<number | undefined>();
  const [districtId, setDistrictId] = useState<number | undefined>();
  const [wardCode, setWardCode] = useState<string | undefined>();

  const [registerError, setRegisterError] = useState<string | null>(null);

  const { data: provinces = [], isLoading: loadingProvinces } = useGhnProvinces();
  const { data: wards = [], isLoading: loadingWards } = useGhnWards(provinceId);

  const registerShop = useRegisterGhnShop();

  const districts = useMemo(() => {
    if (!wards || wards.length === 0) return [];
    const map = new Map<number, string>();
    wards.forEach((w) => {
      const dId = w.DistrictID;
      const dName = w.DistrictName || w.district_name;
      if (dId && dName && !map.has(dId)) {
        map.set(dId, dName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [wards]);

  const filteredWards = useMemo(() => {
    if (!districtId) return [];
    return wards.filter((w) => w.DistrictID === districtId);
  }, [wards, districtId]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value ? parseInt(e.target.value) : undefined;
    setProvinceId(pId);
    setDistrictId(undefined);
    setWardCode(undefined);
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dId = e.target.value ? parseInt(e.target.value) : undefined;
    setDistrictId(dId);
    setWardCode(undefined);
  };

  const handleRegister = async () => {
    setRegisterError(null);

    if (!shopName.trim() || !shopPhone.trim() || !address.trim() || !provinceId || !districtId || !wardCode) {
      setRegisterError("Vui lòng điền đầy đủ các thông tin đăng ký shop.");
      return;
    }

    const selectedProvince = provinces.find((p) => p.ProvinceID === provinceId);
    const selectedWard = wards.find((w) => w.WardCode === wardCode);

    if (!selectedProvince || !selectedWard) {
      setRegisterError("Không tìm thấy thông tin phường xã.");
      return;
    }

    const provinceLabel = selectedProvince.ProvinceName;
    const wardLabel = selectedWard.WardName || selectedWard.name || "";
    const addressV2 = `${address.trim()}, ${wardLabel}, ${provinceLabel}`;

    const payload = {
      name: shopName.trim(),
      phone: shopPhone.trim(),
      ward_id_v2: selectedWard.ward_id_v2 ?? selectedWard.WardIDV2 ?? selectedWard.WardID,
      address_v2: addressV2,
      is_new_address: true,
    };

    try {
      const res = await registerShop.mutateAsync({
        body: { bizContent: payload },
        ghnToken,
      });

      const shopId = res?.shop_id || res?.shopId || res?.ShopID;
      if (shopId) {
        onRegistered(String(shopId));
      } else {
        throw new Error("Đăng ký thành công nhưng API không trả về Shop ID.");
      }
    } catch (err: any) {
      setRegisterError(err.message || "Lỗi đăng ký shop GHN.");
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-orange-500/10 pb-2">
        <Settings className="w-4 h-4 text-orange-500" />
        Đăng ký Shop Giao Hàng Nhanh Mới
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Tên shop đăng ký</label>
          <input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className={`${CONTROL_CLASS} h-8 py-1 text-xs w-full`}
            placeholder="Tên shop nhận hàng"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Số điện thoại liên hệ</label>
          <input
            type="text"
            value={shopPhone}
            onChange={(e) => setShopPhone(e.target.value)}
            className={`${CONTROL_CLASS} h-8 py-1 text-xs w-full`}
            placeholder="Số điện thoại gửi hàng"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Tỉnh / Thành phố</label>
          <div className="relative">
            <select
              value={provinceId || ""}
              onChange={handleProvinceChange}
              disabled={loadingProvinces}
              className={`${CONTROL_CLASS} w-full h-8 py-1 pr-8 text-xs font-medium appearance-none`}
            >
              <option value="">-- Chọn Tỉnh/Thành --</option>
              {provinces.map((p) => (
                <option key={p.ProvinceID} value={p.ProvinceID}>
                  {p.ProvinceName}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Quận / Huyện</label>
          <div className="relative">
            <select
              value={districtId || ""}
              onChange={handleDistrictChange}
              disabled={!provinceId || loadingWards}
              className={`${CONTROL_CLASS} w-full h-8 py-1 pr-8 text-xs font-medium appearance-none`}
            >
              <option value="">-- Chọn Quận/Huyện --</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Phường / Xã</label>
          <div className="relative">
            <select
              value={wardCode || ""}
              onChange={(e) => setWardCode(e.target.value)}
              disabled={!districtId}
              className={`${CONTROL_CLASS} w-full h-8 py-1 pr-8 text-xs font-medium appearance-none`}
            >
              <option value="">-- Chọn Phường/Xã --</option>
              {filteredWards.map((w) => (
                <option key={w.WardCode} value={w.WardCode}>
                  {w.WardName || w.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--foreground-soft)]">Địa chỉ gửi hàng (Số nhà/Đường)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${CONTROL_CLASS} h-8 py-1 text-xs w-full`}
            placeholder="Ví dụ: 12 Nguyễn Huệ"
          />
        </div>
      </div>

      {registerError && (
        <p className="text-[10px] text-red-500 font-semibold">{registerError}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          disabled={registerShop.isPending}
          onClick={handleRegister}
          className="inline-flex h-7 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-[11px] font-semibold text-white shadow-md hover:bg-blue-600 disabled:opacity-50 transition-all duration-200"
        >
          {registerShop.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          Xác nhận tạo
        </button>
      </div>
    </div>
  );
}
