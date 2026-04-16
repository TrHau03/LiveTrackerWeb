export interface DeliveryProvider {
  provider: string;
  name: string;
  isActive: boolean;
  configured: boolean;
  hasEnvFallback: boolean;
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
