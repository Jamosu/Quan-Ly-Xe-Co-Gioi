-- Only construction, agriculture and transport vehicles belong to the managed fleet.
-- Support machines remain real assets but must not enter dispatch/vehicle totals.
UPDATE `vehicle_types`
SET `isAssignable` = CASE
  WHEN `assetGroup` IN ('MAY_CONG_TRINH', 'MAY_NONG_NGHIEP', 'XE_VAN_TAI_CONG_VU') THEN true
  ELSE false
END;
