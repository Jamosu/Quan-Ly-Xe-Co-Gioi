# Driver flow

Driver identity is `User` with `role=DRIVER`; operational detail is held in `DriverProfile` and assignment records.

Keep these dimensions separate:

- Employment: `DANG_LAM_VIEC` / `DA_NGHI_VIEC`.
- Shift availability: `SAN_SANG`, `DANG_VAN_HANH`, `NGHI_PHEP_CA`.
- Account: `User.isActive`.
- Assignment: driver-management, vehicle-driver, and work-driver assignment histories.
- Compliance: license and health-check expiry fields.

Driver lifecycle actions happen through work-order/dispatch endpoints. Do not compress these independent statuses into a new enum.
