# Vehicle flow

`Vehicle.status` uses `HOAT_DONG`, `TAM_DUNG`, `BAO_DUONG`, `SUA_CHUA`, and `CHO_PHAN_CONG`. Maintenance and repair workflows synchronize that state. Assignment to a management unit links a vehicle to the team, manager context, drivers, and operational work.

Vehicle types are managed by `VehicleType`; manufacturers/models use dedicated master models where mapped. Agricultural implements are separate `AgriculturalImplement` records and must not be presented as road vehicles.

For the Koun Mom workbook import, `Đơn vị sử dụng = Loại biên` means the asset is liquidated: the vehicle must be stored as `TAM_DUNG`, have no management-team assignment, and must not be offered as an operational dispatch resource. Confirmed by the product owner on 2026-09-21.

Vehicle workbook synchronization is additive/update-only. A real vehicle that is absent from a later workbook is reported as `retainedOutOfWorkbook` and remains available for historical lookup; it is never deleted by the importer. User-facing removal archives the record as `TAM_DUNG` with the `Loại biên` marker and an `OperationalAuditLog` event. Hard deletion is reserved for dedicated data-repair tooling that removes records proven to be misclassified equipment.
