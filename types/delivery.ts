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
  lastCenterName?: string;
  sortingCode?: string;
  providerCreateOrderTime?: string;
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

export interface DeliveryProviderConfig {
  id: string;
  provider: string;
  apiAccount?: string;
  customerCode?: string;
  shopId?: string;
  partnerCode?: string;
  baseUrl?: string;
  isActive?: boolean;
  hasPrivateKey?: boolean;
  hasCustomerKey?: boolean;
  hasToken?: boolean;
  hasReferToken?: boolean;
  hasPassword?: boolean;
  hasCustomerPassword?: boolean;
  metadata?: any;
  updatedAt?: string;
  createdAt?: string;
}

export interface DeliveryProviderConfigUpsertPayload {
  apiAccount?: string;
  privateKey?: string;
  customerCode?: string;
  customerKey?: string;
  password?: string;
  token?: string;
  shopId?: string;
  partnerCode?: string;
  referToken?: string;
  baseUrl?: string;
  isActive?: boolean;
  metadata?: any;
}

export interface DeliveryDetailTrackingEvent {
  time?: string;
  description?: string;
  typeCode?: number | string;
  typeName?: string;
  locationName?: string;
  locationId?: string;
  actorName?: string;
  actorPhone?: string;
  receivedAt?: string;
  updatedAt?: string;
  status?: string;
}

export interface DeliveryOrderHistoryDetail {
  id: string;
  orderId?: string;
  provider: string;
  providerConfigId?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  shipment?: {
    txlogisticId?: string;
    billCode?: string;
    orderCode?: string;
    clientOrderCode?: string;
    sortingCode?: string;
    sortCode?: string;
    labelId?: string;
    partnerId?: string;
    area?: string;
    providerCreatedAt?: string;
    createdAt?: string;
    pickDate?: string;
    deliverDate?: string;
    orderDate?: string;
    pickupTime?: string;
    expectedDeliveryAt?: string;
    leadtime?: string;
    transportType?: string;
  };
  service?: {
    orderType?: string;
    serviceType?: string;
    deliveryType?: string;
    goodsType?: string;
    payType?: string;
    expressType?: string;
    serviceTypeId?: number;
    paymentTypeId?: number;
    requiredNote?: string;
    pickShift?: number[];
  };
  sender?: {
    name?: string;
    phone?: string;
    mobile?: string;
    prov?: string;
    province?: string;
    city?: string;
    district?: string;
    area?: string;
    ward?: string;
    address?: string;
  };
  receiver?: {
    name?: string;
    phone?: string;
    mobile?: string;
    prov?: string;
    province?: string;
    city?: string;
    district?: string;
    area?: string;
    ward?: string;
    address?: string;
  };
  returnAddress?: {
    name?: string;
    phone?: string;
    province?: string;
    district?: string;
    ward?: string;
    address?: string;
  };
  packageInfo?: {
    weight?: number | string;
    length?: number | string;
    width?: number | string;
    height?: number | string;
    convertedWeight?: number;
    content?: string;
  };
  items?: Array<{
    itemName?: string;
    name?: string;
    englishName?: string;
    quantity?: number | string;
    number?: number | string;
    itemValue?: number | string;
    price?: number;
    weight?: number;
    code?: string;
    category?: {
      level1?: string;
    };
  }>;
  amount?: {
    goodsValue?: number | string;
    codMoney?: number | string;
    codAmount?: number;
    insuranceValue?: number;
    estimatedShippingFee?: number;
    totalFee?: number | string;
    codFee?: number;
    insuranceFee?: number;
    codFailedAmount?: number;
    feeBreakdown?: {
      mainService?: number;
      insurance?: number;
      coupon?: number;
      returnFee?: number;
      stationDo?: number;
      stationPu?: number;
      r2s?: number;
      codFailedFee?: number;
    };
  };
  isInsured?: boolean;
  note?: string;
  tracking?: {
    currentCenterName?: string;
    latestEvent?: DeliveryDetailTrackingEvent;
    history?: DeliveryDetailTrackingEvent[];
  };
  logs?: DeliveryDetailTrackingEvent[];
  latestLog?: DeliveryDetailTrackingEvent;
}

