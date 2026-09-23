# Vehicle flow

`Vehicle.status` uses `HOAT_DONG`, `TAM_DUNG`, `BAO_DUONG`, `SUA_CHUA`, and `CHO_PHAN_CONG`. Maintenance and repair workflows synchronize that state. Assignment to a management unit links a vehicle to the team, manager context, drivers, and operational work.

### Production organization sync, 2026-09-23

- **DOCUMENTED BEHAVIOR:** Each vehicle has one unique code. The local management directory and vehicle-to-unit assignments are the approved source for this production correction.
- **IMPLEMENTED BEHAVIOR:** Production had the management units but no vehicle or implement `managementUnitId` links. Among matching vehicle codes, 1,543 had a different `complexCode` from local. The one-time sync matched by unique code and copied only `complexCode`, `unit`, `assignedUnitCode`, and `managementUnitId` for vehicles, and `unit`, `assignedUnitCode`, and `managementUnitId` for implements. It changed 2,344 production vehicles and 938 implements. A second dry run reported zero differences. A pre-change JSON snapshot is in the private `output/` directory.
- **GAP:** 46 vehicle codes exist only locally; 687 vehicle and 64 implement codes exist only on production. The sync did not create or delete assets, change operational history, or copy driver assignments. Rows that differ in name despite sharing a code were left with their production names.
- **RECOMMENDED CHANGE:** Review one-sided asset codes and driver assignment history separately before any import or removal. Keep code uniqueness enforced by the database and avoid matching by display name.

Vehicle types are managed by `VehicleType`; manufacturers/models use dedicated master models where mapped. Agricultural implements are separate `AgriculturalImplement` records and must not be presented as road vehicles.

For the Koun Mom workbook import, `Đơn vị sử dụng = Loại biên` means the asset is liquidated: the vehicle must be stored as `TAM_DUNG`, have no management-team assignment, and must not be offered as an operational dispatch resource. Confirmed by the product owner on 2026-09-21.

Vehicle workbook synchronization is additive/update-only. A real vehicle that is absent from a later workbook is reported as `retainedOutOfWorkbook` and remains available for historical lookup; it is never deleted by the importer. User-facing removal archives the record as `TAM_DUNG` with the `Loại biên` marker and an `OperationalAuditLog` event. Hard deletion is reserved for dedicated data-repair tooling that removes records proven to be misclassified equipment.
