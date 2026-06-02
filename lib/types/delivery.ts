export interface DeliveryProvider {
  id?: string;
  provider: string;
  displayName: string;
  name?: string;
  isActive?: boolean;
  configured?: boolean;
  hasEnvFallback?: boolean;
  logo?: string;
}

export interface JtCreateOrderBizContent {
  txlogisticId: string;
  expressType: string;
  orderType: string;
  serviceType: string;
  deliveryType: string;
  goodsType: string;
  productType: string;
  partSign: string;
  weight: string;
  totalQuantity: string;
  payType: string;
  goodsValue: string;
  codMoney: string;
  remark?: string;
  sender: {
    name: string;
    mobile: string;
    prov: string;
    city: string; // Often empty if prov/area is used
    area: string;
    address: string;
  };
  receiver: {
    name: string;
    mobile: string;
    prov: string;
    city: string;
    area: string;
    address: string;
  };
}

export interface JtCalculateFeesBizContent {
  senderProv: string;
  senderArea: string;
  receiverProv: string;
  receiverArea: string;
  weight: string;
  length?: string;
  width?: string;
  height?: string;
}

export interface JtCalculateFeesResult {
  fee: number;
  currency: string;
}

export interface DeliveryCreateOrderResult {
  txlogisticId: string;
  billCode: string;
  orderCode?: string;
}

export interface DeliveryOrderHistory {
  id: string;
  orderId: string;
  provider: string;
  txlogisticId: string;
  billCode: string;
  status: string;
  statusName: string;
  createdAt: string;
  updatedAt: string;
}

// GHN Types
export interface GhnProvince {
  ProvinceID: number;
  ProvinceName: string;
}

export interface GhnDistrict {
  DistrictID: number;
  DistrictName: string;
}

export interface GhnWard {
  id?: number | string;
  WardID?: number;
  WardIDV2?: number;
  ward_id_v2?: number;
  WardCode?: string;
  DistrictID?: number;
  WardName?: string;
  ward_name?: string;
  name?: string;
  label?: string;
  DistrictName?: string;
  district_name?: string;
  ProvinceID?: number;
  NameExtension?: string[];
}

export interface GhnCalculateFeesBizContent {
  service_type_id: number;
  to_district_id: number;
  to_ward_code: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  insurance_value?: number;
  cod_failed_amount?: number;
}

export interface GhnCalculateFeesResult {
  total: number;
  service_fee: number;
}

export interface GhnCreateOrderBizContent {
  to_name: string;
  to_phone: string;
  to_address: string;
  to_ward_code: string;
  to_district_id: number;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  service_type_id: number;
  payment_type_id: number;
  required_note: string;
  items: Array<{
    name: string;
    code?: string;
    quantity: number;
    price?: number;
    weight?: number;
  }>;
  cod_amount?: number;
  note?: string;
  client_order_code?: string;
}

// GHTK Types
export interface GhtkCalculateFeesBizContent {
  pick_province: string;
  pick_district: string;
  province: string;
  district: string;
  address: string;
  weight: number | string;
  value?: number | string;
  transport?: string;
  deliver_option?: string;
  tags?: number[];
}

export interface GhtkCalculateFeesResult {
  success?: boolean;
  message?: string;
  fee?: {
    fee?: number;
    insurance_fee?: number;
    delivery?: boolean;
  };
}

export interface GhtkCreateOrderBizContent {
  products: Array<{
    name: string;
    weight: number;
    quantity: number;
    price?: number;
    product_code?: string | number;
  }>;
  order: {
    id: string;
    pick_name: string;
    pick_address: string;
    pick_province: string;
    pick_district: string;
    pick_ward?: string;
    pick_street?: string;
    pick_tel: string;
    name: string;
    address: string;
    province: string;
    district: string;
    ward?: string;
    street?: string;
    hamlet?: string;
    tel: string;
    is_freeship?: "0" | "1" | string;
    pick_money?: number;
    value?: number;
    note?: string;
    weight_option?: "gram" | "kilogram" | string;
    total_weight?: number;
    transport?: string;
  };
}
