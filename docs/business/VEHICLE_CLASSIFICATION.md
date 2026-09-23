# Vehicle classification

Use `VehicleType`, its category/domain/assignability fields, and the current asset scope. Do not construct filter options from arbitrary page records.

- Mechanical/road vehicles use the fleet vehicle scope.
- Agricultural implements and attached tools use the implement scope.
- Other assets must use their approved asset group; do not show implements such as pumps or saws in the mechanical-vehicle filter.

Canonical IDs are filter values; labels are display data.

For the Koun Mom workbook, dedicated equipment sheets feed `AgriculturalImplement`, not `Vehicle`. A code found in the implement catalog is excluded from vehicle import; if the same code also occurs in a dedicated vehicle sheet, import must stop and report a classification conflict. Dispatch APIs must likewise reject any legacy `Vehicle` whose code still exists in the implement catalog.
