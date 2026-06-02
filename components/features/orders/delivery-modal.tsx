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
  Calculator,
  Send,
  Building2
} from "lucide-react";
import { 
  asRecord, 
  pickString, 
  pickNumber, 
  formatCurrency,
  extractCollection
} from "@/lib/proxy-client";
import { 
  useDeliveryProviders, 
  useCalculateFees, 
  useCreateDeliveryOrder 
} from "@/hooks/use-delivery";
import { useSession } from "@/components/session-provider";
import { 
  CONTROL_CLASS
} from "@/components/ui/workspace-shared";
import { AddressCascadingSelect, AddressData, DeliveryProviderType } from "./address-cascading-select";

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Record<string, unknown>;
}

export function DeliveryModal({ isOpen, onClose, order }: DeliveryModalProps) {
  const { session } = useSession();
  const user = session.user;
  
  // States
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  
  // Base Form State
  const [form, setForm] = useState({
    senderName: "",
    senderMobile: "",
    receiverName: "",
    receiverMobile: "",
    
    weight: "0.5",
    length: "10",
    width: "10",
    height: "10",
    totalQuantity: "1",
    goodsValue: "0",
    codMoney: "0",
    remark: "",
    
    // JT specific
    jtServiceType: "1",
    jtProductType: "EXPRESS",
    jtPayType: "PP_PM",
    
    // GHN specific
    ghnServiceTypeId: 2,
    ghnPaymentTypeId: 1,
    
    // GHTK specific
    ghtkTransport: "road",
    ghtkIsFreeship: "1",
  });

  const [senderAddress, setSenderAddress] = useState<AddressData>({
    provinceName: "",
    districtName: "",
    detailAddress: ""
  });

  const [receiverAddress, setReceiverAddress] = useState<AddressData>({
    provinceName: "",
    districtName: "",
    detailAddress: ""
  });

  const [addressMode, setAddressMode] = useState<"new" | "old">("new");

  // Queries & Mutations
  const { data: providers, isLoading: loadingProviders } = useDeliveryProviders();
  const calculateFees = useCalculateFees();
  const createOrder = useCreateDeliveryOrder();

  const currentProvider = useMemo(() => {
    return providers?.find(p => (p.id || p.provider) === selectedProviderId) || providers?.[0];
  }, [providers, selectedProviderId]);

  const providerType = (currentProvider?.provider || "jt-express") as "jt-express" | "ghn" | "ghtk";

  // Initialize form with order and user data
  useEffect(() => {
    if (isOpen && order) {
      const customer = asRecord(order.customerId);
      
      const rawComments = (order.commentIds || order.comments || []) as unknown[];
      let products = Array.isArray(rawComments)
        ? rawComments
            .map((c) => asRecord(c))
            .filter((c) => Object.keys(c).length > 0)
            .filter((c) => pickString(c, ["status"]) !== "BACKUP")
            .map((c, index) => ({
              name: pickString(c, ["text", "content"]) || `Sản phẩm ${index + 1}`,
              sku: pickString(c, ["sku", "productSku", "code"]),
              price: pickNumber(c, ["price"]) ?? 0,
              quantity: pickNumber(c, ["quantity"]) ?? 1,
            }))
        : [];

      if (products.length === 0) {
        products = extractCollection(order.items).map((item) => ({
          name: pickString(item, ["productName", "name", "title"]) || "Sản phẩm không tên",
          sku: pickString(item, ["sku", "code"]),
          price: pickNumber(item, ["price"]) ?? 0,
          quantity: pickNumber(item, ["quantity", "count"]) ?? 1,
        }));
      }

      const totalQty = products.reduce((acc, item) => acc + item.quantity, 0);
      
      const currentShop = user?.shops?.[0];

      setForm(prev => ({
        ...prev,
        senderName: currentShop?.name || user?.fullName || "",
        senderMobile: currentShop?.phone || user?.phone || "",
        
        receiverName: pickString(customer, ["igName", "fullName", "fbName"]) || pickString(order, ["customerName"]) || "",
        receiverMobile: pickString(order, ["phone"]) || pickString(customer, ["phone"]) || "",
        
        goodsValue: String(pickNumber(order, ["totalPrice"]) || 0),
        codMoney: String(pickNumber(order, ["totalPrice"]) || 0),
        totalQuantity: String(totalQty || 1),
      }));

      // Initialize address text (IDs will be populated manually by user or by API later)
      setSenderAddress({
        provinceName: currentShop?.province || user?.autofill?.ghn?.old_address?.from_province_name || "",
        districtName: currentShop?.district || user?.autofill?.ghn?.old_address?.from_district_name || "",
        wardName: currentShop?.ward || user?.autofill?.ghn?.old_address?.from_ward_name || "",
        detailAddress: currentShop?.address || user?.address || "",
      });

      setReceiverAddress({
        provinceName: pickString(order, ["province"]) || pickString(customer, ["province"]) || "",
        districtName: pickString(order, ["district"]) || pickString(customer, ["district"]) || "",
        wardName: pickString(order, ["ward"]) || pickString(customer, ["ward"]) || "",
        detailAddress: pickString(order, ["street"]) || pickString(customer, ["street"]) || "",
      });
    }
  }, [isOpen, order, user]);

  // Set default provider when providers load
  useEffect(() => {
    if (providers?.length && !selectedProviderId) {
      setSelectedProviderId(providers[0].id || providers[0].provider);
    }
  }, [providers, selectedProviderId]);

  if (!isOpen) return null;

  const handleUpdateField = (field: keyof typeof form, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: String(value) }));
  };

  const buildCalculateFeeParams = () => {
    if (providerType === "jt-express") {
      return {
        weight: Number(form.weight) || 0.5,
        selfAddress: 0,
        productType: form.jtProductType,
        goodsType: "bm000010",
        goodsValue: Number(form.goodsValue) || 0,
        codMoney: Number(form.codMoney) || 0,
        sender: {
          prov: senderAddress.provinceName,
          city: null,
          area: senderAddress.districtName,
        },
        receiver: {
          prov: receiverAddress.provinceName,
          city: null,
          area: receiverAddress.districtName,
        }
      };
    } else if (providerType === "ghn") {
      return {
        service_type_id: form.ghnServiceTypeId,
        to_district_id: Number(receiverAddress.districtId) || 0,
        to_ward_code: receiverAddress.wardCode || "",
        weight: (Number(form.weight) || 0.5) * 1000, // GHN uses grams
        length: Number(form.length) || 10,
        width: Number(form.width) || 10,
        height: Number(form.height) || 10,
        insurance_value: Number(form.goodsValue) || 0,
      };
    } else if (providerType === "ghtk") {
      return {
        pick_province: senderAddress.provinceName,
        pick_district: senderAddress.districtName,
        province: receiverAddress.provinceName,
        district: receiverAddress.districtName,
        address: receiverAddress.detailAddress,
        weight: (Number(form.weight) || 0.5) * 1000,
        value: Number(form.goodsValue) || 0,
        transport: form.ghtkTransport,
      };
    }
    throw new Error("Provider không hợp lệ");
  };

  const handleCalculateFee = async () => {
    try {
      const bizContent = buildCalculateFeeParams();
      const result = await calculateFees.mutateAsync({
        provider: providerType,
        bizContent
      });
      
      let feeValue = 0;
      if (providerType === "jt-express") feeValue = result.price;
      else if (providerType === "ghn") feeValue = result.total;
      else if (providerType === "ghtk") feeValue = result.fee?.fee || 0;

      alert(`Phí dự tính: ${formatCurrency(feeValue)}`);
    } catch (err: any) {
      alert(err.message || "Có lỗi khi tính phí");
    }
  };

  const buildCreateOrderParams = () => {
    const rawComments = (order?.commentIds || order?.comments || []) as unknown[];
    let itemsRaw = Array.isArray(rawComments)
      ? rawComments
          .map((c) => asRecord(c))
          .filter((c) => Object.keys(c).length > 0)
          .filter((c) => pickString(c, ["status"]) !== "BACKUP")
          .map((c, index) => ({
            name: pickString(c, ["text", "content"]) || `Sản phẩm ${index + 1}`,
            sku: pickString(c, ["sku", "productSku", "code"]),
            price: pickNumber(c, ["price"]) ?? 0,
            quantity: pickNumber(c, ["quantity"]) ?? 1,
          }))
      : [];

    if (itemsRaw.length === 0) {
      itemsRaw = extractCollection(order?.items).map((item) => ({
        name: pickString(item, ["productName", "name", "title"]) || "Sản phẩm không tên",
        sku: pickString(item, ["sku", "code"]),
        price: pickNumber(item, ["price"]) ?? 0,
        quantity: pickNumber(item, ["quantity", "count"]) ?? 1,
      }));
    }
    
    if (providerType === "jt-express") {
      return {
        txlogisticId: `LT${Date.now()}`,
        orderType: "1",
        selfAddress: 0,
        serviceType: form.jtServiceType,
        deliveryType: "1",
        sender: {
          name: form.senderName,
          mobile: form.senderMobile,
          prov: senderAddress.provinceName,
          city: "",
          area: senderAddress.districtName,
          address: senderAddress.detailAddress,
        },
        receiver: {
          name: form.receiverName,
          mobile: form.receiverMobile,
          prov: receiverAddress.provinceName,
          city: "",
          area: receiverAddress.districtName,
          address: receiverAddress.detailAddress,
        },
        goodsType: "bm000010",
        productType: form.jtProductType,
        packageInfo: { weight: form.weight },
        payType: form.jtPayType,
        expressType: "EZ",
        partSign: "0",
        totalQuantity: Number(form.totalQuantity) || 1,
        itemsValue: form.goodsValue,
        goodsValue: form.goodsValue,
        codMoney: form.codMoney,
        remark: form.remark,
      };
    } else if (providerType === "ghn") {
      const mappedItems = itemsRaw.length ? itemsRaw.map(item => ({
        name: pickString(item, ["name", "productName"]) || "Sản phẩm",
        quantity: pickNumber(item, ["quantity"]) || 1,
        price: pickNumber(item, ["price"]) || 0,
        weight: Math.round(((Number(form.weight) || 0.5) * 1000) / itemsRaw.length)
      })) : [{
        name: "Sản phẩm tổng hợp",
        quantity: Number(form.totalQuantity) || 1,
        price: Number(form.goodsValue) || 0,
        weight: (Number(form.weight) || 0.5) * 1000
      }];

      return {
        to_name: form.receiverName,
        to_phone: form.receiverMobile,
        to_address: receiverAddress.detailAddress,
        to_ward_code: receiverAddress.wardCode || "",
        to_district_id: Number(receiverAddress.districtId) || 0,
        weight: (Number(form.weight) || 0.5) * 1000,
        length: Number(form.length) || 10,
        width: Number(form.width) || 10,
        height: Number(form.height) || 10,
        service_type_id: Number(form.ghnServiceTypeId),
        payment_type_id: Number(form.ghnPaymentTypeId),
        required_note: "CHOTHUHANG",
        items: mappedItems,
        cod_amount: Number(form.codMoney) || 0,
        note: form.remark,
        client_order_code: `LT${Date.now()}`
      };
    } else if (providerType === "ghtk") {
      const mappedProducts = itemsRaw.length ? itemsRaw.map(item => ({
        name: pickString(item, ["name", "productName"]) || "Sản phẩm",
        weight: Math.round(((Number(form.weight) || 0.5) * 1000) / itemsRaw.length),
        quantity: pickNumber(item, ["quantity"]) || 1,
        price: pickNumber(item, ["price"]) || 0,
      })) : [{
        name: "Sản phẩm tổng hợp",
        weight: (Number(form.weight) || 0.5) * 1000,
        quantity: Number(form.totalQuantity) || 1,
        price: Number(form.goodsValue) || 0,
      }];

      return {
        products: mappedProducts,
        order: {
          id: `LT${Date.now()}`,
          pick_name: form.senderName,
          pick_address: senderAddress.detailAddress,
          pick_province: senderAddress.provinceName,
          pick_district: senderAddress.districtName,
          pick_ward: senderAddress.wardName,
          pick_tel: form.senderMobile,
          name: form.receiverName,
          address: receiverAddress.detailAddress,
          province: receiverAddress.provinceName,
          district: receiverAddress.districtName,
          ward: receiverAddress.wardName,
          tel: form.receiverMobile,
          is_freeship: form.ghtkIsFreeship,
          pick_money: Number(form.codMoney) || 0,
          value: Number(form.goodsValue) || 0,
          note: form.remark,
          weight_option: "gram",
          total_weight: (Number(form.weight) || 0.5) * 1000,
          transport: form.ghtkTransport
        }
      };
    }
    throw new Error("Provider không hợp lệ");
  };

  const handleSubmit = async () => {
    try {
      const bizContent = buildCreateOrderParams();
      await createOrder.mutateAsync({
        provider: providerType,
        bizContent
      });
      alert("Tạo đơn giao hàng thành công!");
      onClose();
    } catch (err: any) {
      alert(err.message || "Có lỗi khi tạo đơn");
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
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-strong)] flex items-center justify-center text-white shadow-lg shadow-[var(--primary)]/15">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                Giao hàng đa kênh
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

        {/* Layout with all sections (Bỏ no-scrollbar để hiện thanh cuộn, thêm min-h-0 và max-h) */}
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[calc(95vh-180px)] p-8 bg-[var(--surface-subdued)]/30">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left Column: Receiver Info */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-6">
                <SectionTitle icon={<Building2 className="text-[var(--primary)]" />} title="Đơn vị vận chuyển" />
                <div className="grid grid-cols-4 gap-4">
                  {providers?.map(p => {
                    const uniqueId = p.id || p.provider;
                    // Chuẩn hoá tên ngắn gọn để tránh tràn chữ
                    const getShortName = (name: string) => {
                      const lower = name.toLowerCase();
                      if (lower.includes("ghn") || lower.includes("giao hàng nhanh")) return "GHN";
                      if (lower.includes("ghtk") || lower.includes("giao hàng tiết kiệm") || lower.includes("giao hang tiet")) return "GHTK";
                      if (lower.includes("viettel")) return "ViettelPost";
                      if (lower.includes("j&t") || lower.includes("jt")) return "J&T Express";
                      return name;
                    };
                    return (
                      <button
                        key={uniqueId}
                        onClick={() => setSelectedProviderId(uniqueId)}
                        className={`h-14 rounded-2xl font-black text-xs border-2 transition-all ${
                          selectedProviderId === uniqueId 
                            ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)] shadow-sm"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        {getShortName(p.displayName || p.name || "")}
                      </button>
                    );
                  })}
                  {(!providers || providers.length === 0) && (
                    <div className="col-span-3 text-center text-sm text-[var(--muted)] py-4">
                      {loadingProviders ? "Đang tải danh sách..." : "Không có cấu hình đối tác vận chuyển."}
                    </div>
                  )}
                </div>
              </div>

              {/* Chế độ chọn địa chỉ (Global) */}
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-sm flex items-center justify-between">
                <div>
                  <h5 className="font-black text-sm text-[var(--foreground)] uppercase tracking-wider">Cách chọn địa chỉ giao hàng</h5>
                  <p className="text-xs text-[var(--muted)] font-medium">Áp dụng đồng bộ cho cả người gửi và người nhận</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddressMode(addressMode === "new" ? "old" : "new")}
                  className="px-4 py-2.5 rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)] font-black text-xs hover:bg-[var(--primary)] hover:text-white transition-all active:scale-95 border border-[var(--primary)]/20"
                >
                  {addressMode === "new" ? "DÙNG ĐỊA CHỈ CŨ (3 CẤP)" : "DÙNG ĐỊA CHỈ MỚI (2 CẤP)"}
                </button>
              </div>

              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<User className="text-[var(--primary)]" />} title="Thông tin người nhận" />
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
                
                <AddressCascadingSelect 
                  provider={providerType}
                  addressMode={addressMode}
                  providerConfigId={selectedProviderId}
                  value={receiverAddress}
                  onChange={setReceiverAddress}
                />
              </div>

              {/* Sender Info (Editable) */}
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<Truck className="text-[var(--primary)]" />} title="Thông tin người gửi (Kho hàng)" />
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

                <AddressCascadingSelect 
                  provider={providerType}
                  addressMode={addressMode}
                  providerConfigId={selectedProviderId}
                  value={senderAddress}
                  onChange={setSenderAddress}
                />
              </div>
            </div>

            {/* Right Column: Package & Shipping Settings */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              <div className="rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-8 shadow-sm space-y-8">
                <SectionTitle icon={<Package className="text-[var(--primary)]" />} title="Chi tiết kiện hàng" />
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
                      className={CONTROL_CLASS + " w-full font-black text-[var(--primary)] bg-[var(--primary-soft)]/40"}
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

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Dài (cm)">
                    <input 
                      type="number" value={form.length}
                      onChange={e => handleUpdateField("length", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Rộng (cm)">
                    <input 
                      type="number" value={form.width}
                      onChange={e => handleUpdateField("width", e.target.value)}
                      className={CONTROL_CLASS + " w-full"}
                    />
                  </FormField>
                  <FormField label="Cao (cm)">
                    <input 
                      type="number" value={form.height}
                      onChange={e => handleUpdateField("height", e.target.value)}
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
                <SectionTitle icon={<Settings2 className="text-[var(--primary)]" />} title="Vận chuyển & Thanh toán" />
                
                {providerType === "jt-express" && (
                  <>
                    <FormField label="Loại dịch vụ J&T">
                      <select value={form.jtProductType} onChange={e => handleUpdateField("jtProductType", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value="EXPRESS">Chuyển phát tiêu chuẩn (J&T)</option>
                        <option value="FAST">Giao hàng nhanh</option>
                        <option value="SUPER">Siêu tốc</option>
                      </select>
                    </FormField>
                    <FormField label="Hình thức trả cước J&T">
                      <select value={form.jtPayType} onChange={e => handleUpdateField("jtPayType", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value="PP_PM">Người gửi trả sau (Cuối tháng)</option>
                        <option value="PP_CASH">Người gửi trả tiền mặt</option>
                        <option value="CC_CASH">Người nhận trả tiền mặt</option>
                      </select>
                    </FormField>
                  </>
                )}

                {providerType === "ghn" && (
                  <>
                    <FormField label="Dịch vụ GHN">
                      <select value={form.ghnServiceTypeId} onChange={e => handleUpdateField("ghnServiceTypeId", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value={2}>Chuyển phát thương mại điện tử</option>
                        <option value={5}>Chuyển phát truyền thống</option>
                      </select>
                    </FormField>
                    <FormField label="Bên thanh toán phí GHN">
                      <select value={form.ghnPaymentTypeId} onChange={e => handleUpdateField("ghnPaymentTypeId", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value={1}>Người gửi (Shop) thanh toán</option>
                        <option value={2}>Người nhận (Khách hàng) thanh toán</option>
                      </select>
                    </FormField>
                  </>
                )}

                {providerType === "ghtk" && (
                  <>
                    <FormField label="Phương thức vận chuyển GHTK">
                      <select value={form.ghtkTransport} onChange={e => handleUpdateField("ghtkTransport", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value="road">Đường bộ (Chuẩn)</option>
                        <option value="fly">Đường bay (Nhanh)</option>
                      </select>
                    </FormField>
                    <FormField label="Hình thức trả cước GHTK">
                      <select value={form.ghtkIsFreeship} onChange={e => handleUpdateField("ghtkIsFreeship", e.target.value)} className={CONTROL_CLASS + " w-full"}>
                        <option value="1">Shop trả phí (Freeship)</option>
                        <option value="0">Khách trả phí</option>
                      </select>
                    </FormField>
                  </>
                )}

                <div className="pt-4">
                  <button 
                    onClick={handleCalculateFee}
                    disabled={calculateFees.isPending || !providers?.length}
                    className="w-full h-14 rounded-2xl bg-[var(--primary-soft)] hover:bg-[var(--primary)] hover:text-white text-[var(--primary)] border border-[var(--primary)]/10 font-black text-xs transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95 disabled:opacity-50"
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
              <span className="text-2xl font-black text-[var(--primary)]">{formatCurrency(Number(form.codMoney))}</span>
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
                disabled={createOrder.isPending || !providers?.length}
                className="h-14 px-10 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-xs font-black text-white shadow-lg shadow-[var(--primary)]/15 transition-all flex items-center gap-3 active:scale-[0.97] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {createOrder.isPending ? "ĐANG XỬ LÝ..." : "GỬI ĐƠN GIAO HÀNG"}
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
