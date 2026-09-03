---
name: gps-monitoring-alerts
description: Handle live GPS fleet views, telemetry, playback, geofences, speed and route-deviation alerts, offline logs, alert-center screens, and driver SOS. Use for /gps, /canh-bao, maps, coordinates, last-GPS timestamps, transport telemetry, or emergencies.
---

# Gps Monitoring Alerts

# Purpose

Thay đổi GPS/cảnh báo mà không biến mock presentation hoặc ngưỡng chưa chốt thành rule.

# When to use

Live map, playback, geofence, speed/offline alerts, telemetry, route deviation hoặc SOS.

# Relevant project areas

Frontend: `pages/gps`, `pages/alerts`, `components/maps`.
Backend: `dashboard`, `vehicles`, `transport`, `mobile-driver`.
Database: Vehicle GPS fields, TransportOrder, DriverSosAlert.
Docs: BRD II.6, II.11, II.13.

# Current architecture

Không có alerts module/model chung; logic phân tán theo domain. Alert pages có thể là mock. API mapper sở hữu UI mapping.

# Project conventions

Giữ coordinates/timestamp ở backend; map marker ở frontend; để domain service sở hữu alert flag.

# Business rules

- VERIFIED: GPS location/history/geofence thuộc BRD. Source: BRD Table 6.
- VERIFIED: SOS tạo alert + repair và đổi vehicle trong transaction. Source: `mobile-driver.service.ts`.
- IMPLEMENTED: TransportOrder có maxSpeedLimit/isRouteDeviated. Source: schema.
- UNKNOWN: chu kỳ 30 giây; speed/route thresholds; offline/abnormal-stop definition.

# Implementation workflow

1. Xác định owner domain của alert.
2. Tìm model/endpoint hiện có.
3. Tách measurement, threshold, evaluated state, UI label.
4. Xin xác nhận threshold UNKNOWN.
5. Đồng bộ mapper/map/filter.
6. Kiểm tra timezone/null coordinates.

# Do not

Không hard-code ngưỡng chưa chốt; không coi mock marker là realtime; không tạo alert abstraction ngoài scope.

# Validation

Build; test null/stale GPS, status colors, deviation và SOS transaction.

# Related skills

`vehicle-equipment-management`, `planning-dispatch-logistics`, `dashboard-reporting`, `react-frontend`.
