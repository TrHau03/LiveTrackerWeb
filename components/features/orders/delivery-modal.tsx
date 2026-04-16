"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Truck, 
  User, 
  MapPin, 
  Package, 
  DollarSign, 
  Settings2,
  ChevronDown,
  Search,
  Calculator,
  Send
} from "lucide-react";
import { 
  asRecord, 
  pickString, 
  pickNumber, 
  formatCurrency,
  extractCollection
} from "@/lib/proxy-client";
import { useProvinces, useWards } from "@/hooks/use-provinces";
import { 
  useDeliveryProviders, 
  useCalculateFees, 
  useCreateDeliveryOrder 
} from "@/hooks/use-delivery";
import { useSession } from "@/components/session-provider";
import { 
  CONTROL_CLASS, 
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  LoadingState,
  ErrorState
} from "@/components/ui/workspace-shared";

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Record<string, unknown>;
}

export function DeliveryModal({ isOpen, onClose, order }: DeliveryModalProps) {
  const { session } = useSession();
  const user = session.user;
  
  // States
  const [selectedProvider, setSelectedProvider] = useState<string>("jt-express");
  
  // Form State
  const [form, setForm] = useState({
    senderName: "",
    senderMobile: "",
    senderProv: "",
    senderArea: "",
    senderAddress: "",
    
    receiverName: "",
    receiverMobile: "",
    receiverProv: "",
    receiverArea: "",
    receiverAddress: "",
    
    weight: "0.5",
    totalQuantity: "1",
    goodsValue: "0",
    codMoney: "0",
    remark: "",
    
    orderType: "1",
    serviceType: "1",
    deliveryType: "1",
    goodsType: "bm000010",
    productType: "EXPRESS",
    payType: "PP_PM",
    partSign: "0",
  });

  // Queries & Mutations
  const { data: provinces, isLoading: loadingProvinces } = useProvinces();
  
  const senderProvinceCode = useMemo(() => 
    Array.isArray(provinces) ? provinces.find(p => p.name === form.senderProv || p.fullName === form.senderProv)?.code : undefined
  , [provinces, form.senderProv]);
  
  const receiverProvinceCode = useMemo(() => 
    Array.isArray(provinces) ? provinces.find(p => p.name === form.receiverProv || p.fullName === form.receiverProv)?.code : undefined
  , [provinces, form.receiverProv]);

  const { data: senderWards } = useWards(senderProvinceCode);
  const { data: receiverWards } = useWards(receiverProvinceCode);
  
  const { data: providers } = useDeliveryProviders();
  const calculateFees = useCalculateFees();
  const createOrder = useCreateDeliveryOrder();

  // Initialize form with order and user data
  useEffect(() => {
    if (isOpen && order) {
      const customer = asRecord(order.customerId);
      const items = extractCollection(order.items);
      const totalQty = items.reduce((acc, item) => acc + (pickNumber(item, ["quantity"]) || 1), 0);
      
      const currentShop = user?.shops?.[0];

      setForm(prev => ({
        ...prev,
        senderName: currentShop?.name || user?.fullName || "",
        senderMobile: currentShop?.phone || user?.phone || "",
        senderAddress: currentShop?.address || user?.address || "",
        
        receiverName: pickString(customer, ["igName", "fullName", "fbName"]) || pickString(order, ["customerName"]) || "",
        receiverMobile: pickString(order, ["phone"]) || pickString(customer, ["phone"]) || "",
        receiverProv: pickString(order, ["province"]) || pickString(customer, ["province"]) || "",
        receiverArea: pickString(order, ["ward"]) || pickString(customer, ["ward"]) || "",
        receiverAddress: pickString(order, ["street"]) || pickString(customer, ["street"]) || "",
        
        goodsValue: String(pickNumber(order, ["totalPrice"]) || 0),
        codMoney: String(pickNumber(order, ["totalPrice"]) || 0),
        totalQuantity: String(totalQty || 1),
      }));
    }
  }, [isOpen, order, user]);

  if (!isOpen) return null;

  const handleUpdateField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculateFee = async () => {
    if (!form.senderProv || !form.receiverProv) {
      alert("Vui lòng nhập đầy đủ tỉnh thành gửi/nhận");
      return;
    }
    try {
      const result = await calculateFees.mutateAsync({
        senderProv: form.senderProv,
        senderArea: form.senderArea,
        receiverProv: form.receiverProv,
        receiverArea: form.receiverArea,
        weight: String(form.weight || "0"),
      });
      alert(`Phí dự tính: ${formatCurrency(result?.fee)}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async () => {
    const items = extractCollection(order.items).map(item => ({
      itemName: pickString(item, ["name", "text"]) || "Sản phẩm",
      number: pickNumber(item, ["quantity"]) || 1,
      itemValue: pickNumber(item, ["price"]) || 0,
    }));

    try {
      const bizContent = {
        txlogisticId: `LT${Date.now()}`,
        expressType: "EZ",
        orderType: String(form.orderType),
        serviceType: String(form.serviceType),
        deliveryType: String(form.deliveryType),
        goodsType: form.goodsType,
        productType: form.productType,
        partSign: String(form.partSign || "0"),
        weight: String(form.weight || "0"),
        totalQuantity: String(form.totalQuantity || "1"),
        goodsValue: String(form.goodsValue || "0"),
        codMoney: String(form.codMoney || "0"),
        remark: form.remark,
        payType: form.payType,
        items,
        sender: {
          name: form.senderName,
          mobile: form.senderMobile,
          prov: form.senderProv,
          city: "",
          area: form.senderArea,
          address: form.senderAddress,
        },
        receiver: {
          name: form.receiverName,
          mobile: form.receiverMobile,
          prov: form.receiverProv,
          city: "",
          area: form.receiverArea,
          address: form.receiverAddress,
        }
      };
      
      await createOrder.mutateAsync(bizContent as any);
      alert("Tạo đơn giao hàng thành công!");
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div 
        className="absolute inset-0 z-0" 
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-6xl max-h-[95vh] flex-col bg-[var(--surface)] shadow-2xl rounded-[2.5rem] border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] p-8 shrink-0 bg-[var(--surface-subdued)]">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#1447E6] to-[#0E3BBF] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                Giao hàng nhanh
              </h4>
              <p className="text-sm text-[var(--muted)] font-bold uppercase tracking-widest">
                Đơn hàng #{pickString(order, ["orderCode"]) || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--muted)] hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 transition-all active:scale-90 shadow-sm border border-[var(--border)]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Layout with all sections */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-[var(--surface-subdued)]/30">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left Column: Receiver Info */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<User className="text-[#1447E6]" />} title="Thông tin người nhận" />
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Tên khách hàng">
                    <input 
                      type="text"
                      value={form.receiverName}
                      onChange={e => handleUpdateField("receiverName", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Số điện thoại">
                    <input 
                      type="text"
                      value={form.receiverMobile}
                      onChange={e => handleUpdateField("receiverMobile", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Tỉnh / Thành">
                    <select 
                      value={form.receiverProv}
                      onChange={e => {
                        handleUpdateField("receiverProv", e.target.value);
                        handleUpdateField("receiverArea", "");
                      }}
                      className={CONTROL_CLASS + " w-full"}
                    >
                      <option value="">Chọn Tỉnh/Thành</option>
                      {Array.isArray(provinces) && provinces.map(p => (
                        <option key={p.code} value={p.name}>{p.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Quận / Huyện">
                    <select 
                      value={form.receiverArea}
                      onChange={e => handleUpdateField("receiverArea", e.target.value)}
                      disabled={!receiverProvinceCode}
                      className={CONTROL_CLASS + " w-full"}
                    >
                      <option value="">Chọn Quận/Huyện</option>
                      {Array.isArray(receiverWards) && receiverWards.map(w => (
                        <option key={w.code} value={w.name}>{w.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
                
                <FormField label="Địa chỉ chi tiết (Số nhà, tên đường...)">
                  <textarea 
                    value={form.receiverAddress}
                    onChange={e => handleUpdateField("receiverAddress", e.target.value)}
                    className={CONTROL_CLASS + " w-full h-28 pt-3 resize-none"}
                    placeholder="VD: 123 Đường ABC, Phường 1..."
                  />
                </FormField>
              </div>

              {/* Sender Info (Editable) */}
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<Truck className="text-[#1447E6]" />} title="Thông tin người gửi (Kho hàng)" />
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Tên người gửi / Tên kho">
                    <input 
                      type="text"
                      value={form.senderName}
                      onChange={e => handleUpdateField("senderName", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Số điện thoại gửi">
                    <input 
                      type="text"
                      value={form.senderMobile}
                      onChange={e => handleUpdateField("senderMobile", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Tỉnh / Thành gửi">
                    <select 
                      value={form.senderProv}
                      onChange={e => {
                        handleUpdateField("senderProv", e.target.value);
                        handleUpdateField("senderArea", "");
                      }}
                      className={CONTROL_CLASS + " w-full"}
                    >
                      <option value="">Chọn Tỉnh/Thành</option>
                      {Array.isArray(provinces) && provinces.map(p => (
                        <option key={p.code} value={p.name}>{p.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Quận / Huyện gửi">
                    <select 
                      value={form.senderArea}
                      onChange={e => handleUpdateField("senderArea", e.target.value)}
                      disabled={!senderProvinceCode}
                      className={CONTROL_CLASS + " w-full"}
                    >
                      <option value="">Chọn Quận/Huyện</option>
                      {Array.isArray(senderWards) && senderWards.map(w => (
                        <option key={w.code} value={w.name}>{w.fullName}</option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <FormField label="Địa chỉ kho chi tiết">
                  <input 
                    type="text"
                    value={form.senderAddress}
                    onChange={e => handleUpdateField("senderAddress", e.target.value)}
                    className={CONTROL_CLASS + " w-full"}
                    placeholder="Số nhà, tên đường..."
                  />
                </FormField>
              </div>
            </div>

            {/* Right Column: Package & Shipping Settings */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<Package className="text-[#1447E6]" />} title="Chi tiết kiện hàng" />
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Giá trị hàng" icon={<DollarSign />}>
                    <input 
                      type="number"
                      value={form.goodsValue}
                      onChange={e => handleUpdateField("goodsValue", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Tiền COD" icon={<DollarSign />}>
                    <input 
                      type="number"
                      value={form.codMoney}
                      onChange={e => handleUpdateField("codMoney", e.target.value)}
                      className={CONTROL_CLASS + " w-full font-black text-[#1447E6] bg-blue-50/30"}
                    />
                  </FormField>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <FormField label="Trọng lượng (kg)">
                    <input 
                      type="number" step="0.1"
                      value={form.weight}
                      onChange={e => handleUpdateField("weight", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Số lượng">
                    <input 
                      type="number"
                      value={form.totalQuantity}
                      onChange={e => handleUpdateField("totalQuantity", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                </div>

                <FormField label="Ghi chú đơn hàng">
                  <input 
                    type="text"
                    value={form.remark}
                    onChange={e => handleUpdateField("remark", e.target.value)}
                    className={CONTROL_CLASS + " w-full"}
                    placeholder="Ghi chú cho shipper..."
                  />
                </FormField>
              </div>

              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-6">
                <SectionTitle icon={<Settings2 className="text-[#1447E6]" />} title="Vận chuyển & Thanh toán" />
                
                <FormField label="Loại dịch vụ">
                  <select value={form.productType} onChange={e => handleUpdateField("productType", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                    <option value="EXPRESS">Chuyển phát tiêu chuẩn (J&T)</option>
                    <option value="FAST">Giao hàng nhanh</option>
                    <option value="SUPER">Siêu tốc</option>
                  </select>
                </FormField>

                <FormField label="Hình thức trả cước">
                  <select value={form.payType} onChange={e => handleUpdateField("payType", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                    <option value="PP_PM">Người gửi trả sau (Cuối tháng)</option>
                    <option value="PP_CASH">Người gửi trả tiền mặt</option>
                    <option value="CC_CASH">Người nhận trả tiền mặt</option>
                  </select>
                </FormField>

                <div className="pt-4">
                  <button 
                    onClick={handleCalculateFee}
                    disabled={calculateFees.isPending}
                    className="w-full h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/10 text-[#1447E6] border border-blue-100 dark:border-blue-800/20 font-black text-xs transition-all hover:bg-[#1447E6] hover:text-white flex items-center justify-center gap-3 shadow-sm active:scale-95"
                  >
                    <Calculator className="w-5 h-5" />
                    {calculateFees.isPending ? "ĐANG TÍNH PHÍ..." : "DỰ TÍNH PHÍ VẬN CHUYỂN"}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 flex items-center justify-between">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider">Tổng cộng cần thu</span>
              <span className="text-2xl font-black text-[#1447E6]">{formatCurrency(Number(form.codMoney))}</span>
           </div>
           <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="h-14 px-8 rounded-2xl bg-[var(--surface-strong)] hover:bg-[var(--hover)] text-xs font-black text-[var(--muted)] transition-all active:scale-[0.97] border border-[var(--border)]"
              >
                HỦY BỎ
              </button>
              <button 
                onClick={handleSubmit}
                disabled={createOrder.isPending}
                className="h-14 px-10 rounded-2xl bg-[#1447E6] hover:bg-[#0E3BBF] text-xs font-black text-white shadow-xl shadow-blue-500/20 transition-all flex items-center gap-3 active:scale-[0.97] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {createOrder.isPending ? "ĐANG XỬ LÝ..." : "GỬI ĐƠN GIAO Hàng"}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        {icon && <div className="text-[var(--muted)]">{icon}</div>}
        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</label>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center gap-2 px-1">
      {icon} {title}
    </h5>
  );
}
