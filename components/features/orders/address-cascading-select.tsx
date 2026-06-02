"use client";

import React, { useMemo, useEffect, useRef } from "react";
import { useProvinces, useWards, useOldProvinces, useOldDistricts, useOldWards } from "@/hooks/use-provinces";
import { useGhnProvinces, useGhnWards } from "@/hooks/use-delivery";
import { CONTROL_CLASS } from "@/components/ui/workspace-shared";

export type DeliveryProviderType = "jt-express" | "ghn" | "ghtk" | string;

export interface AddressData {
  provinceId?: number | string;
  provinceName: string;
  districtId?: number | string;
  districtName: string;
  wardCode?: string;
  wardName?: string;
  detailAddress: string;
}

interface AddressCascadingSelectProps {
  provider: DeliveryProviderType;
  addressMode: "new" | "old";
  providerConfigId?: string; // For GHN API
  value: AddressData;
  onChange: (value: AddressData) => void;
  labelPrefix?: string;
  disabled?: boolean;
}

export function AddressCascadingSelect({
  provider,
  addressMode,
  providerConfigId,
  value,
  onChange,
  labelPrefix = "",
  disabled = false,
}: AddressCascadingSelectProps) {
  const isFirstMount = useRef(true);

  // Tự động xoá lựa chọn cũ khi đổi chế độ để tránh xung đột dữ liệu
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    onChange({
      ...value,
      provinceId: undefined,
      provinceName: "",
      districtId: undefined,
      districtName: "",
      wardCode: undefined,
      wardName: ""
    });
  }, [addressMode]);

  // We use GHN data for both GHN and GHTK because it's comprehensive (3 levels)
  // We use standard data for J&T (2 levels)
  const useGhnData = addressMode === "new" && (provider === "ghn" || provider === "ghtk");
  const useStandardData = addressMode === "new" && !useGhnData;

  // -- Standard Data (J&T etc. 2 levels) --
  const { data: stdProvinces } = useProvinces();
  const stdProvinceCode = useMemo(() => {
    if (useStandardData && value.provinceName && Array.isArray(stdProvinces)) {
      return stdProvinces.find(
        (p) => p.name === value.provinceName || p.fullName === value.provinceName
      )?.code;
    }
    return undefined;
  }, [useStandardData, value.provinceName, stdProvinces]);
  const { data: stdDistricts } = useWards(useStandardData ? stdProvinceCode : undefined); // Note: useWards actually fetches districts/wards directly under province in standard API

  // -- GHN Data --
  const { data: ghnProvinces } = useGhnProvinces(useGhnData ? providerConfigId : undefined);
  const { data: ghnWardsRaw } = useGhnWards(
    useGhnData ? (value.provinceId as number) : undefined,
    providerConfigId
  );

  // Group GHN Districts from Wards
  const ghnDistricts = useMemo(() => {
    if (!useGhnData || !Array.isArray(ghnWardsRaw)) return [];
    const map = new Map<number, string>();
    ghnWardsRaw.forEach((w) => {
      if (w.DistrictID && w.DistrictName && !map.has(w.DistrictID)) {
        map.set(w.DistrictID, w.DistrictName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [useGhnData, ghnWardsRaw]);

  // Filter GHN Wards by selected District
  const ghnWards = useMemo(() => {
    if (!useGhnData || !Array.isArray(ghnWardsRaw)) return [];
    if (addressMode === "new") {
      // Khi dùng địa chỉ mới (ẩn Quận/Huyện), hiển thị toàn bộ Phường/Xã thuộc Tỉnh
      return ghnWardsRaw;
    }
    return value.districtId ? ghnWardsRaw.filter((w) => w.DistrictID === value.districtId) : [];
  }, [useGhnData, value.districtId, ghnWardsRaw, addressMode]);

  // -- Old Data (3-level for all providers when addressMode === "old") --
  const { data: oldProvinces } = useOldProvinces();
  const oldProvinceCode = useMemo(() => {
    if (addressMode === "old" && value.provinceName && Array.isArray(oldProvinces)) {
      return oldProvinces.find(
        (p) => p.name === value.provinceName || p.fullName === value.provinceName
      )?.code;
    }
    return undefined;
  }, [addressMode, value.provinceName, oldProvinces]);
  const { data: oldDistricts } = useOldDistricts(addressMode === "old" ? oldProvinceCode : undefined);
  const oldDistrictCode = useMemo(() => {
    if (addressMode === "old" && value.districtName && Array.isArray(oldDistricts)) {
      return oldDistricts.find(
        (d) => d.name === value.districtName || d.fullName === value.districtName
      )?.code;
    }
    return undefined;
  }, [addressMode, value.districtName, oldDistricts]);
  const { data: oldWards } = useOldWards(addressMode === "old" ? oldDistrictCode : undefined);

  // Handle Province Change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange({ ...value, provinceId: undefined, provinceName: "", districtId: undefined, districtName: "", wardCode: undefined, wardName: "" });
      return;
    }
    
    if (useGhnData) {
      const selected = Array.isArray(ghnProvinces)
        ? ghnProvinces.find((p) => String(p.ProvinceID) === val)
        : undefined;
      onChange({
        ...value,
        provinceId: selected?.ProvinceID,
        provinceName: selected?.ProvinceName || "",
        districtId: undefined,
        districtName: "",
        wardCode: undefined,
        wardName: "",
      });
    } else {
      onChange({
        ...value,
        provinceName: val,
        districtId: undefined,
        districtName: "",
        wardCode: undefined,
        wardName: "",
      });
    }
  };

  // Handle District Change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange({ ...value, districtId: undefined, districtName: "", wardCode: undefined, wardName: "" });
      return;
    }

    if (useGhnData) {
      const selected = ghnDistricts.find((d) => String(d.id) === val);
      onChange({
        ...value,
        districtId: selected?.id,
        districtName: selected?.name || "",
        wardCode: undefined,
        wardName: "",
      });
    } else {
      onChange({
        ...value,
        districtName: val,
        wardCode: undefined,
        wardName: "",
      });
    }
  };

  // Handle Ward Change
  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange({ ...value, wardCode: undefined, wardName: "", districtId: undefined, districtName: "" });
      return;
    }

    if (useGhnData) {
      const selected = Array.isArray(ghnWards)
        ? ghnWards.find((w) => String(w.WardCode) === val)
        : undefined;
      onChange({
        ...value,
        wardCode: selected?.WardCode,
        wardName: selected?.WardName || "",
        // Tự động gán districtId và districtName ngầm khi chọn ward ở mode 2 cấp
        districtId: selected?.DistrictID || value.districtId,
        districtName: selected?.DistrictName || value.districtName,
      });
    } else if (addressMode === "old") {
      const selected = Array.isArray(oldWards)
        ? oldWards.find((w) => w.name === val || w.fullName === val)
        : undefined;
      onChange({
        ...value,
        wardCode: selected?.code,
        wardName: val,
      });
    } else if (useStandardData) {
      const selected = Array.isArray(stdDistricts)
        ? stdDistricts.find((d) => d.name === val || d.fullName === val)
        : undefined;
      onChange({
        ...value,
        wardCode: selected?.code,
        wardName: val,
      });
    }
  };

  const showDistrict = addressMode === "old";
  const showWard = useGhnData || addressMode === "old" || useStandardData;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* PROVINCE */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
            Tỉnh / Thành
          </label>
          <select
            value={useGhnData ? value.provinceId || "" : value.provinceName || ""}
            onChange={handleProvinceChange}
            disabled={disabled}
            className={CONTROL_CLASS + " w-full"}
          >
            <option value="">Chọn Tỉnh/Thành</option>
            {useGhnData && Array.isArray(ghnProvinces)
              ? ghnProvinces.map((p) => (
                  <option key={p.ProvinceID} value={p.ProvinceID}>
                    {p.ProvinceName}
                  </option>
                ))
              : addressMode === "old" && Array.isArray(oldProvinces)
              ? oldProvinces.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.fullName || p.name}
                  </option>
                ))
              : useStandardData && Array.isArray(stdProvinces)
              ? stdProvinces.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.fullName || p.name}
                  </option>
                ))
              : null}
          </select>
        </div>

        {/* DISTRICT (Chỉ hiện ở chế độ Địa chỉ cũ) */}
        {showDistrict && (
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              Quận / Huyện
            </label>
            <select
              value={useGhnData ? value.districtId || "" : value.districtName || ""}
              onChange={handleDistrictChange}
              disabled={disabled || (!value.provinceId && !value.provinceName)}
              className={CONTROL_CLASS + " w-full"}
            >
              <option value="">Chọn Quận/Huyện</option>
              {useGhnData && Array.isArray(ghnDistricts)
                ? ghnDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))
                : addressMode === "old" && Array.isArray(oldDistricts)
                ? oldDistricts.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.fullName || d.name}
                    </option>
                  ))
                : null}
            </select>
          </div>
        )}

        {/* WARD (Ở chế độ Địa chỉ mới, Phường/Xã thế chỗ Quận/Huyện trên hàng đầu tiên) */}
        {!showDistrict && showWard && (
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              Phường / Xã
            </label>
            <select
              value={useGhnData ? value.wardCode || "" : value.wardName || ""}
              onChange={handleWardChange}
              disabled={disabled || (!useGhnData && !value.provinceName) || (useGhnData && !value.provinceId)}
              className={CONTROL_CLASS + " w-full"}
            >
              <option value="">Chọn Phường/Xã</option>
              {useGhnData && Array.isArray(ghnWards)
                ? ghnWards.map((w) => (
                    <option key={w.WardCode} value={w.WardCode}>
                      {w.WardName}
                    </option>
                  ))
                : useStandardData && Array.isArray(stdDistricts)
                ? stdDistricts.map((d) => (
                    <option key={d.code} value={d.name}>
                      {d.fullName || d.name}
                    </option>
                  ))
                : null}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* WARD (Chỉ hiển thị ở hàng 2 khi ở chế độ Địa chỉ cũ) */}
        {showDistrict && showWard && (
          <div className="space-y-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
              Phường / Xã
            </label>
            <select
              value={useGhnData ? value.wardCode || "" : value.wardName || ""}
              onChange={handleWardChange}
              disabled={disabled || (!useGhnData && !value.districtName) || (useGhnData && !value.districtId)}
              className={CONTROL_CLASS + " w-full"}
            >
              <option value="">Chọn Phường/Xã</option>
              {useGhnData && Array.isArray(ghnWards)
                ? ghnWards.map((w) => (
                    <option key={w.WardCode} value={w.WardCode}>
                      {w.WardName}
                    </option>
                  ))
                : addressMode === "old" && Array.isArray(oldWards)
                ? oldWards.map((w) => (
                    <option key={w.code} value={w.name}>
                      {w.fullName || w.name}
                    </option>
                  ))
                : null}
            </select>
          </div>
        )}

        {/* DETAIL ADDRESS */}
        <div className={`space-y-2.5 ${(showDistrict && showWard) || (!showDistrict && !showWard) ? "" : "col-span-2"}`}>
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
            Địa chỉ chi tiết
          </label>
          <input
            type="text"
            value={value.detailAddress}
            onChange={(e) => onChange({ ...value, detailAddress: e.target.value })}
            disabled={disabled}
            className={CONTROL_CLASS + " w-full"}
            placeholder="Số nhà, tên đường..."
          />
        </div>
      </div>
    </div>
  );
}
