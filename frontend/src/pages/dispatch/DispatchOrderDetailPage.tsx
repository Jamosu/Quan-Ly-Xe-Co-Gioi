import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Fuel,
  HardHat,
  Info,
  Layers,
  MapPin,
  Printer,
  RefreshCw,
  Tractor,
  Truck,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  FileText,
  CheckSquare,
  Sparkles,
  CalendarClock,
  PhoneCall,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { operationsApi } from '../../api/operations';
import { schedulingApi } from '../../api/scheduling';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge, formatDateTime, ErrorState } from '../../components/operations/OperationUi';
import {
  WorkflowActionPanel,
  type DemoWorkflowStep,
  getVehicleFuelQuotaRate,
} from '../../components/dispatch/WorkflowActionPanel';
import {
  type ExtendedDispatchOrder,
  parseOrderNotes,
} from './DispatchOrdersPage';
import { useAppStore } from '../../store/useAppStore';

export const DispatchOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Nhận order ban đầu từ router state (nếu có từ trang danh sách) để hiển thị 0ms latency
  const routerOrder = (location.state as any)?.order ?? null;
  const isRouterOrderMatching = Boolean(
    routerOrder && (String(routerOrder.id) === String(id) || routerOrder.code === id)
  );

  const [order, setOrder] = useState<ExtendedDispatchOrder | null>(() => {
    return isRouterOrderMatching ? routerOrder : null;
  });
  const [loading, setLoading] = useState<boolean>(!isRouterOrderMatching);
  const [error, setError] = useState<string>('');

  // Modals thao tác nghiệp vụ
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    newDepartureTime: '',
    newPlannedEndTime: '',
    reason: '',
  });

  const [retroOpen, setRetroOpen] = useState(false);
  const [retroForm, setRetroForm] = useState({
    actualStartTime: '',
    actualCompletedTime: '',
    actualMachineHours: '',
    actualQuantity: '',
    notes: '',
  });

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);

  // Tải dữ liệu chi tiết của lệnh điều xe từ API
  const fetchOrder = useCallback(async (isSilent = false) => {
    if (!id) return;
    if (!isSilent) setLoading(true);
    setError('');
    try {
      const numericId = Number(id);
      let foundOrder: ExtendedDispatchOrder | null = null;

      // 1. Nếu là lệnh Vận chuyển (id >= 200000)
      if (numericId >= 200000) {
        const realId = numericId - 200000;
        const res = await operationsApi.transportOrders({ limit: 500 });
        const item = res.items?.find((t: any) => t.id === realId);
        if (item) {
          foundOrder = {
            id: numericId,
            code: item.code,
            orderCategory: 'VAN_CHUYEN',
            categoryLabel: 'Vận chuyển',
            sourceType: 'TRANSPORT_ORDER' as any,
            unit: item.unit || 'KOUN_MOM',
            purpose: item.cargoType || 'Vận chuyển hàng hóa nội bộ',
            origin: item.origin || 'Kho Trung Tâm',
            destination: item.destination || 'Điểm giao hàng',
            departureTime: item.departureTime || item.executionDate || item.requestDate,
            plannedEndTime: item.plannedEndTime,
            status: item.status,
            isDelayed: Boolean(item.isRouteDeviated),
            vehicle: item.vehicle,
            driver: item.driver,
            implement: item.trailer,
            workVolumeTarget: item.tonnage || item.palletCount || 1,
            workVolumeUnit: item.palletCount ? 'Pallet' : 'Tấn',
            plannedFuelLiters: item.plannedFuelLiters,
            notes: item.notes,
            planCode: item.productionOrder?.plan?.code,
            planTitle: item.productionOrder?.plan?.title,
            complexName: item.operationalWorkOrder?.complexName,
            enterpriseName: item.operationalWorkOrder?.enterpriseName,
            farmName: item.operationalWorkOrder?.farmName,
          };
        }
      } else {
        // 2. Lệnh cơ giới sản xuất (Nông nghiệp / Công trình)
        let item: any = null;
        if (!isNaN(numericId) && numericId > 0) {
          try {
            item = await operationsApi.getDispatch(numericId);
          } catch (err) {
            console.warn('Direct getDispatch failed, trying list search:', err);
          }
        }

        if (!item) {
          const dispatchRes = await operationsApi.dispatchOrders({ limit: 1000 });
          item = dispatchRes.items?.find((d: any) => d.id === numericId || d.code === id);
        }

        if (item) {
          const isConstruction = item.productionOrder?.plan?.planType === 'CONSTRUCTION' || item.operationDomain === 'CONSTRUCTION';
          const cat = isConstruction ? 'CONG_TRINH' : 'NONG_NGHIEP';
          const catLabel = isConstruction ? 'Công trình ca máy' : 'Nông nghiệp';

          const rawItem = item as any;
          const durationH = rawItem.departureTime && rawItem.plannedEndTime
            ? Math.max(0.5, (new Date(rawItem.plannedEndTime).getTime() - new Date(rawItem.departureTime).getTime()) / 3_600_000)
            : (rawItem.productionOrder?.planItem?.durationHours || 8);
          const vQuota = rawItem.vehicle ? getVehicleFuelQuotaRate(rawItem.vehicle, cat) : undefined;
          const initialPlannedFuel = rawItem.plannedFuelLiters ?? (vQuota && rawItem.vehicle ? Number((durationH * vQuota).toFixed(1)) : undefined);
          const initialQuotaRate = vQuota && rawItem.vehicle ? `${vQuota} L/h` : rawItem.fuelQuotaRate;

          foundOrder = {
            ...rawItem,
            orderCategory: cat,
            categoryLabel: catLabel,
            planCode: rawItem.productionOrder?.plan?.code,
            planTitle: rawItem.productionOrder?.plan?.title,
            complexName: rawItem.productionOrder?.plan?.complexName || rawItem.operationalWorkOrder?.complexName,
            enterpriseName: rawItem.productionOrder?.plan?.enterpriseName || rawItem.operationalWorkOrder?.enterpriseName,
            farmName: rawItem.operationalWorkOrder?.farmName || rawItem.farmName || rawItem.unit,
            taskJobCode: rawItem.productionOrder?.planItem?.jobCode,
            taskJobName: rawItem.productionOrder?.planItem?.jobName || rawItem.purpose,
            taskPlot: rawItem.destination || rawItem.productionOrder?.planItem?.plotCode,
            workVolumeTarget: rawItem.workVolumeTarget ?? rawItem.operationalWorkOrder?.targetQuantity,
            workVolumeUnit: rawItem.workVolumeUnit ?? rawItem.operationalWorkOrder?.targetUnit ?? (isConstruction ? 'Giờ' : 'Ha'),
            implementGroup: rawItem.productionOrder?.planItem?.implementGroup,
            plannedFuelLiters: initialPlannedFuel,
            fuelQuotaRate: initialQuotaRate,
          };
        }

        if (!foundOrder) {
          try {
            const transportRes = await operationsApi.transportOrders({ limit: 500 });
            const tItem = transportRes.items?.find((t: any) => t.id === numericId || t.code === id || (numericId >= 200000 && t.id === numericId - 200000));
            if (tItem) {
              foundOrder = {
                id: numericId,
                code: tItem.code,
                orderCategory: 'VAN_CHUYEN',
                categoryLabel: 'Vận chuyển',
                sourceType: 'TRANSPORT_ORDER' as any,
                unit: tItem.unit || 'KOUN_MOM',
                purpose: tItem.cargoType || 'Vận chuyển hàng hóa nội bộ',
                origin: tItem.origin || 'Kho Trung Tâm',
                destination: tItem.destination || 'Điểm giao hàng',
                departureTime: tItem.departureTime || tItem.executionDate || tItem.requestDate,
                plannedEndTime: tItem.plannedEndTime,
                status: tItem.status,
                isDelayed: Boolean(tItem.isRouteDeviated),
                vehicle: tItem.vehicle,
                driver: tItem.driver,
                implement: tItem.trailer,
                workVolumeTarget: tItem.tonnage || tItem.palletCount || 1,
                workVolumeUnit: tItem.palletCount ? 'Pallet' : 'Tấn',
                plannedFuelLiters: tItem.plannedFuelLiters,
                notes: tItem.notes,
                planCode: tItem.productionOrder?.plan?.code,
                planTitle: tItem.productionOrder?.plan?.title,
                complexName: tItem.operationalWorkOrder?.complexName,
                enterpriseName: tItem.operationalWorkOrder?.enterpriseName,
                farmName: tItem.operationalWorkOrder?.farmName,
              };
            }
          } catch (e) {
            console.warn('Fallback transport search failed:', e);
          }
        }

        if (!foundOrder && !isNaN(numericId) && numericId > 0) {
          try {
            const wo = await schedulingApi.workOrder(numericId);
            if (wo) {
              const isTransport = wo.category === 'TRANSPORT' || wo.type === 'TRANSPORT';
              const isConstruction = wo.category === 'CONSTRUCTION';
              const cat = isTransport ? 'VAN_CHUYEN' : isConstruction ? 'CONG_TRINH' : 'NONG_NGHIEP';
              const catLabel = isTransport ? 'Vận chuyển' : isConstruction ? 'Công trình ca máy' : 'Nông nghiệp';
              const legOrder = wo.dispatchOrder ?? wo.transportOrder;
              const assignedV = wo.vehicleAssignments?.find((v: any) => v.status === 'ASSIGNED' || v.status === 'ACCEPTED')?.vehicle;
              const assignedD = wo.driverAssignments?.find((d: any) => d.status === 'ASSIGNED' || d.status === 'ACCEPTED')?.driver;

              foundOrder = {
                id: numericId,
                code: legOrder?.code || (wo as any).code || `LDX-${wo.id}`,
                orderCategory: cat as any,
                categoryLabel: catLabel,
                sourceType: wo.sourceType as any,
                unit: wo.unit,
                purpose: wo.jobName,
                origin: legOrder?.origin || 'Bãi xe',
                destination: legOrder?.destination || wo.workLocationText || 'Khu vực thực hiện',
                departureTime: wo.plannedStartAt,
                plannedEndTime: wo.plannedEndAt,
                status: wo.status as any,
                isDelayed: false,
                vehicle: assignedV as any,
                driver: assignedD as any,
                workVolumeTarget: wo.targetQuantity || 1,
                workVolumeUnit: wo.targetUnit || (isTransport ? 'Tấn' : isConstruction ? 'Giờ' : 'Ha'),
                complexName: wo.complexName,
                enterpriseName: wo.enterpriseName,
                farmName: wo.farmName,
                notes: wo.notes,
              };
            }
          } catch (e) {
            console.warn('Fallback workOrder lookup failed:', e);
          }
        }
      }

      if (foundOrder) {
        // Chuẩn hóa thời gian nếu lệnh đang ở trạng thái chờ duyệt
        const isPending = !foundOrder.status || ['CHO_PHAN_CONG', 'PENDING_APPROVAL', 'DRAFT'].includes(foundOrder.status);
        if (isPending && (!foundOrder.departureTime || !foundOrder.plannedEndTime)) {
          const now = new Date();
          const start = now.toISOString();
          const end = new Date(now.getTime() + 8 * 3600000).toISOString();
          foundOrder.departureTime = start;
          foundOrder.plannedEndTime = end;
        }
        setOrder(foundOrder);
      } else {
        setOrder((curr) => {
          if (!curr) setError(`Không tìm thấy dữ liệu lệnh điều xe với mã hoặc ID #${id}`);
          return curr;
        });
      }
    } catch (err: any) {
      console.error('Lỗi khi tải chi tiết lệnh điều xe:', err);
      setOrder((curr) => {
        if (!curr) setError(err?.response?.data?.message || err?.message || 'Không thể kết nối đến máy chủ.');
        return curr;
      });
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const hasCachedData = Boolean(isRouterOrderMatching && order);
    void fetchOrder(hasCachedData);
  }, [id, fetchOrder]);

  const handleVehicleScheduleChange = useCallback((details: {
    vehicle?: any;
    durationHours: number;
    plannedFuelLiters?: number;
    fuelQuotaRate?: string;
  }) => {
    setOrder((current) => {
      if (!current) return current;
      if (
        current.plannedFuelLiters === details.plannedFuelLiters &&
        current.fuelQuotaRate === details.fuelQuotaRate
      ) {
        return current;
      }
      return {
        ...current,
        plannedFuelLiters: details.plannedFuelLiters,
        fuelQuotaRate: details.fuelQuotaRate,
      };
    });
  }, []);

  // Chỉ cập nhật giao diện sau khi endpoint nghiệp vụ đã thành công.
  // Không PATCH lại lệnh đã duyệt/phân công.
  const updateOrderView = (changes: Partial<ExtendedDispatchOrder>) => {
    setOrder((current) => current ? { ...current, ...changes } : current);
  };

  // Tính trạng thái quy trình làm việc
  const workflowStep = useMemo((): DemoWorkflowStep => {
    if (!order?.status) return 'PENDING';
    if (['COMPLETED', 'ACCEPTED', 'CLOSED', 'HOAN_THANH', 'DELIVERED'].includes(order.status)) return 'COMPLETED';
    if (['DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DANG_THI_CONG'].includes(order.status)) return 'RECEIVED';
    if (['ASSIGNED', 'DA_NHAN'].includes(order.status)) return 'APPROVED';
    return 'PENDING';
  }, [order?.status]);

  // Xử lý dời lịch lệnh
  const handleOpenReschedule = () => {
    if (!order) return;
    const now = new Date();
    setRescheduleForm({
      newDepartureTime: order.departureTime ? order.departureTime.slice(0, 16) : now.toISOString().slice(0, 16),
      newPlannedEndTime: order.plannedEndTime ? order.plannedEndTime.slice(0, 16) : new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 16),
      reason: '',
    });
    setActionError('');
    setRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!order) return;
    if (!rescheduleForm.newDepartureTime || !rescheduleForm.newPlannedEndTime) {
      setActionError('Vui lòng chọn đầy đủ thời gian xuất phát và kết thúc ca mới.');
      return;
    }
    if (new Date(rescheduleForm.newPlannedEndTime) <= new Date(rescheduleForm.newDepartureTime)) {
      setActionError('Thời gian kết thúc ca mới phải sau thời gian xuất phát.');
      return;
    }

    setActionSaving(true);
    setActionError('');
    try {
      const res = await operationsApi.rescheduleDispatch(order.id, {
        newDepartureTime: new Date(rescheduleForm.newDepartureTime).toISOString(),
        newPlannedEndTime: new Date(rescheduleForm.newPlannedEndTime).toISOString(),
        reason: rescheduleForm.reason.trim() || undefined,
      });

      const updated = (res as any)?.order ?? res;
      updateOrderView({
        departureTime: updated.departureTime || rescheduleForm.newDepartureTime,
        plannedEndTime: updated.plannedEndTime || rescheduleForm.newPlannedEndTime,
        status: updated.status || order.status,
        ...((res as any)?.resetAssignment ? { vehicle: undefined, driver: undefined, implement: undefined } : {}),
      });

      useAppStore.getState().setHeaderAlert({
        type: 'success',
        message: `Đã dời lịch lệnh ${order.code} thành công.${res?.resetAssignment ? ' (Do trùng lịch nên tài nguyên đã được đưa về Chờ phân công)' : ''}`,
      });
      setRescheduleOpen(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Dời lịch thất bại. Vui lòng thử lại.');
    } finally {
      setActionSaving(false);
    }
  };

  // Xử lý nghiệm thu hồi tố
  const handleOpenRetroactive = () => {
    if (!order) return;
    const now = new Date();
    const startDefault = order.departureTime ? new Date(order.departureTime) : new Date(now.getTime() - 8 * 3600000);
    const endDefault = order.plannedEndTime ? new Date(order.plannedEndTime) : now;
    setRetroForm({
      actualStartTime: startDefault.toISOString().slice(0, 16),
      actualCompletedTime: endDefault.toISOString().slice(0, 16),
      actualMachineHours: '8',
      actualQuantity: order.workVolumeTarget ? String(order.workVolumeTarget) : '',
      notes: '',
    });
    setActionError('');
    setRetroOpen(true);
  };

  const handleConfirmRetroactive = async () => {
    if (!order) return;
    if (!retroForm.actualStartTime || !retroForm.actualCompletedTime) {
      setActionError('Vui lòng nhập đầy đủ giờ bắt đầu và hoàn thành thực tế.');
      return;
    }

    setActionSaving(true);
    setActionError('');
    try {
      const res = await operationsApi.retroactiveCompleteDispatch(order.id, {
        actualStartTime: new Date(retroForm.actualStartTime).toISOString(),
        actualCompletedTime: new Date(retroForm.actualCompletedTime).toISOString(),
        actualMachineHours: retroForm.actualMachineHours ? Number(retroForm.actualMachineHours) : undefined,
        actualQuantity: retroForm.actualQuantity ? Number(retroForm.actualQuantity) : undefined,
        notes: retroForm.notes.trim() || undefined,
      });

      const updated = (res ?? order) as any;
      updateOrderView({
        status: updated.status || 'CLOSED',
        actualDepartureTime: updated.actualDepartureTime || retroForm.actualStartTime,
        actualEndTime: updated.actualEndTime || updated.completedAt || retroForm.actualCompletedTime,
        workVolumeActual: retroForm.actualQuantity ? Number(retroForm.actualQuantity) : order.workVolumeTarget,
      });

      useAppStore.getState().setHeaderAlert({
        type: 'success',
        message: `Đã nghiệm thu hồi tố và đóng lệnh ${order.code} thành công!`,
      });
      setRetroOpen(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Nghiệm thu hồi tố thất bại.');
    } finally {
      setActionSaving(false);
    }
  };

  // Xử lý hủy lệnh điều xe
  const handleOpenCancel = () => {
    setCancelReason('');
    setActionError('');
    setCancelOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    const trimmedReason = cancelReason.trim();
    if (!trimmedReason) {
      setActionError('Vui lòng nhập hoặc chọn nguyên nhân hủy lệnh điều xe.');
      return;
    }
    setActionSaving(true);
    setActionError('');
    try {
      const res = await operationsApi.cancelDispatch(order.id, trimmedReason);
      const updated = (res ?? order) as any;
      updateOrderView({
        status: 'CANCELLED',
        rejectionReason: trimmedReason,
        cancelledAt: new Date().toISOString(),
        ...updated,
      });
      useAppStore.getState().setHeaderAlert({
        type: 'success',
        message: `Đã hủy lệnh điều xe ${order.code} thành công! Nguyên nhân: ${trimmedReason}`,
      });
      setCancelOpen(false);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || 'Hủy lệnh thất bại. Vui lòng thử lại.');
    } finally {
      setActionSaving(false);
    }
  };

  // Badge hiển thị danh mục lệnh
  const renderCategoryBadge = (cat?: ExtendedDispatchOrder['orderCategory']) => {
    switch (cat) {
      case 'NONG_NGHIEP':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Tractor className="h-3.5 w-3.5 text-emerald-600" />
            <span>Nông nghiệp cơ giới</span>
          </span>
        );
      case 'CONG_TRINH':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
            <HardHat className="h-3.5 w-3.5 text-amber-700" />
            <span>Công trình ca máy</span>
          </span>
        );
      case 'VAN_CHUYEN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300">
            <Truck className="h-3.5 w-3.5 text-indigo-700" />
            <span>Vận chuyển nội bộ</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-300">
            <Tractor className="h-3.5 w-3.5 text-slate-600" />
            <span>Điều xe vận hành</span>
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        <p className="text-sm font-semibold text-slate-600">Đang tải hồ sơ lệnh điều xe #{id}...</p>
      </div>
    );
  }

  // Xử lý quay về đúng danh sách lệnh trước đó
  const handleBack = () => {
    const fromPath = (location.state as any)?.from;
    if (fromPath && typeof fromPath === 'string') {
      navigate(fromPath);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (order?.orderCategory === 'CONG_TRINH') {
      navigate('/lenh-dieu-xe/lenh-cong-trinh');
    } else if (order?.orderCategory === 'VAN_CHUYEN') {
      navigate('/lenh-dieu-xe/lenh-noi-bo');
    } else if (order?.orderCategory === 'NONG_NGHIEP') {
      navigate('/lenh-dieu-xe/lenh-nong-nghiep');
    } else {
      navigate('/lenh-dieu-xe/danh-sach');
    }
  };

  if (error || !order) {
    return (
      <div className="space-y-4 py-8">
        <Button variant="outline" icon={<ArrowLeft className="h-4 w-4" />} onClick={handleBack}>
          Quay lại danh sách lệnh
        </Button>
        <ErrorState message={error || 'Không tìm thấy dữ liệu lệnh điều xe'} onRetry={() => void fetchOrder()} />
      </div>
    );
  }

  const { planNotes, taskNotes, rawNotes } = parseOrderNotes(order);
  const durationHours = order.departureTime && order.plannedEndTime
    ? Math.max(0.5, (new Date(order.plannedEndTime).getTime() - new Date(order.departureTime).getTime()) / 3_600_000)
    : 8;
  const createdBy = order.createdBy || order.requester;

  return (
    <div className="space-y-6 pb-20">
      {/* 1. THANH ĐIỀU HƯỚNG & CÔNG CỤ TRÊN CÙNG */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={handleBack}
            className="hover:bg-slate-100 font-bold"
          >
            Quay lại danh sách lệnh
          </Button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {order.code}
              </h1>
              {renderCategoryBadge(order.orderCategory)}
              <StatusBadge status={order.status} />
              {order.isDelayed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                  <AlertTriangle className="h-3 w-3 text-red-600" />
                  <span>Trễ hạn xuất phát</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hồ sơ điều động cơ giới sản xuất • {order.planCode ? <>Khởi tạo từ Kế hoạch tuần: <b>{order.planCode}</b></> : <><b>Lệnh tạo trực tiếp</b>, không thuộc kế hoạch tuần</>}
            </p>
          </div>
        </div>

        {/* CÁC NÚT THAO TÁC NGHIỆP VỤ CHÍNH */}
        <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">

          {['PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'CHO_DUYET', 'CHO_PHAN_CONG', 'DA_DUYET', 'DA_NHAN', 'DRAFT'].includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              onClick={handleOpenReschedule}
              className="text-amber-800 border-amber-300 bg-amber-50/70 hover:bg-amber-100 font-bold"
            >
              Dời lịch lệnh
            </Button>
          )}

          {['PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'CHO_DUYET', 'CHO_PHAN_CONG', 'DA_DUYET', 'DA_NHAN', 'DRAFT'].includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
              onClick={handleOpenCancel}
              className="text-rose-700 border-rose-300 bg-rose-50/70 hover:bg-rose-100 font-bold shadow-xs"
            >
              Hủy lệnh
            </Button>
          )}

          {order.status === 'CANCELLED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <XCircle className="h-4 w-4 text-rose-600" />
              <span>Lệnh đã hủy</span>
            </span>
          )}

          {['ASSIGNED', 'DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'DA_NHAN', 'DANG_THI_CONG'].includes(order.status) && (
            <Button
              variant="outline"
              size="sm"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              onClick={handleOpenRetroactive}
              className="text-emerald-800 border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 font-bold"
            >
              Nghiệm thu hồi tố
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-4 w-4 text-slate-500" />}
            onClick={() => void fetchOrder()}
            title="Tải lại dữ liệu mới nhất"
          />
        </div>
      </div>

      {/* THÔNG BÁO LỆNH ĐÃ BỊ HỦY */}
      {order.status === 'CANCELLED' && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-red-900 shadow-xs flex items-start gap-3.5">
          <div className="rounded-xl bg-red-100 p-2 text-red-600 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-red-900">Lệnh điều xe này đã được hủy (CANCELLED)</h4>
            <p className="text-xs text-red-700 leading-relaxed">
              Lệnh điều phối đã dừng thực thi và tự động giải phóng phương tiện/thợ lái về trạng thái Chờ phân công.
              {(order as any).rejectionReason ? <span className="block mt-1 font-medium text-red-800">Lý do hủy: {(order as any).rejectionReason}</span> : null}
              {(order as any).cancelledAt ? <span className="block text-[11px] text-red-600 mt-0.5">Thời điểm hủy: {formatDateTime((order as any).cancelledAt)}</span> : null}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Người tạo lệnh</div>
          <div className="font-bold text-slate-900">{createdBy?.fullName || 'Chưa xác định'}</div>
          <div className="mt-1 text-xs text-slate-500">{createdBy?.code || '—'} · {order.createdAt ? formatDateTime(order.createdAt) : 'Chưa có thời gian tạo'}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Xe thực hiện</div>
          <div className="font-bold text-slate-900">{order.vehicle?.code || 'Chưa phân công xe'}</div>
          <div className="mt-1 text-xs text-slate-600">Quản lý xe: <b className="text-slate-800">{order.vehicle?.manager?.fullName || 'Chưa phân công'}</b></div>
          {order.vehicle?.managementUnit && <div className="mt-1 text-xs text-slate-500">{order.vehicle.managementUnit.name}</div>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Tài xế thực hiện</div>
          <div className="font-bold text-slate-900">{order.driver?.fullName || 'Chưa phân công tài xế'}</div>
          <div className="mt-1 text-xs text-slate-600">Quản lý tài xế: <b className="text-slate-800">{order.driver?.manager?.fullName || 'Chưa phân công'}</b></div>
          {order.driver?.managementUnit && <div className="mt-1 text-xs text-slate-500">{order.driver.managementUnit.name}</div>}
        </div>
      </div>

      {/* 2. THANH TIẾN TRÌNH THỰC THI LỆNH (MINI PIPELINE STEPPER) */}
      <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          {/* Bước 1 */}
          <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200 min-w-0">
            <div className="h-5 w-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0">
              ✓
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">1. Nguồn lệnh</span>
              <span className="text-[10px] text-slate-500 truncate block">{order.planCode ? `KH: ${order.planCode}` : 'Tạo trực tiếp'}</span>
            </div>
          </div>

          {/* Bước 2 */}
          <div className={`flex items-center gap-2 p-1.5 rounded-lg border min-w-0 ${
            order.vehicle
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50 border-amber-300 ring-1 ring-amber-200'
          }`}>
            <div className={`h-5 w-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
              order.vehicle
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-500 text-white animate-pulse'
            }`}>
              {order.vehicle ? '✓' : '2'}
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">2. Giao xe & Thợ lái</span>
              <span className="text-[10px] text-slate-600 truncate block">
                {order.vehicle?.code
                  ? `Xe ${order.vehicle.code}`
                  : 'Chờ điều phối'}
              </span>
            </div>
          </div>

          {/* Bước 3 */}
          <div className={`flex items-center gap-2 p-1.5 rounded-lg border min-w-0 ${
            ['DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status)
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className={`h-5 w-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
              ['DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status)
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {['DRIVER_ACCEPTED', 'DEPARTED', 'WORKING', 'IN_TRANSIT', 'COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status) ? '✓' : '3'}
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">3. Tác nghiệp tại lô</span>
              <span className="text-[10px] text-slate-500 truncate block">
                {order.departureTime ? formatDateTime(order.departureTime) : 'Theo kế hoạch'}
              </span>
            </div>
          </div>

          {/* Bước 4 */}
          <div className={`flex items-center gap-2 p-1.5 rounded-lg border min-w-0 ${
            ['COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status)
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className={`h-5 w-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
              ['COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status)
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}>
              {['COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status) ? '✓' : '4'}
            </div>
            <div className="truncate">
              <span className="font-bold text-slate-900 block truncate">4. Nghiệm thu đóng ca</span>
              <span className="text-[10px] text-slate-500 truncate block">
                {['COMPLETED', 'CLOSED', 'ACCEPTED'].includes(order.status) ? 'Đã hoàn tất' : 'Chờ xong ca'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BẢNG HỒ SƠ TỔNG QUAN LỆNH (EXECUTIVE ORDER MATRIX) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cột 1: Kế hoạch & Đơn vị */}
          <div className="space-y-1.5 sm:pr-3">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>{order.planCode ? 'Kế hoạch sản xuất' : 'Nguồn phát lệnh'}</span>
            </div>
            <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug break-words">
              {order.planTitle || 'Lệnh điều xe phát sinh trực tiếp'}
            </div>
            <div className="text-[11.5px] text-slate-600 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                {order.planCode || 'TRỰC TIẾP'}
              </span>
              <span className="text-slate-300">•</span>
              <b className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                {order.farmName || order.unit || 'Nông trường DP1.2'}
              </b>
            </div>
            <div className="text-xs text-slate-600 break-words leading-snug">
              {[order.enterpriseName, order.complexName].filter(Boolean).join(' · ') || 'Xí nghiệp Chuối DP1 · Khu liên hợp Koun Mom'}
            </div>
          </div>

          {/* Cột 2: Hạng mục & Khối lượng */}
          <div className="space-y-1.5 sm:px-3 pt-3 sm:pt-0">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Nhiệm vụ & Khối lượng</span>
            </div>
            <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug break-words">
              {order.taskJobName || order.purpose}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                {order.workVolumeTarget ? `${order.workVolumeTarget} ${order.workVolumeUnit || 'Ha'}` : 'Theo ca'}
              </span>
              {order.taskJobCode && (
                <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {order.taskJobCode}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 break-words leading-snug">
              Nông cụ: <b className="text-slate-900 font-semibold">{order.implement?.name || order.implementGroup || 'Theo nhóm máy cơ giới'}</b>
            </div>
          </div>

          {/* Cột 3: Lô thửa & Thời gian ca */}
          <div className="space-y-1.5 sm:px-3 pt-3 sm:pt-0">
            <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-600" />
              <span>Lô thửa & Thời gian ca</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="leading-snug break-words">
                <span className="text-slate-500 font-medium">Xuất phát: </span>
                <span className="font-semibold text-slate-800">{order.origin || 'Bãi xe trung tâm'}</span>
              </div>
              <div className="leading-snug break-words flex items-start gap-1">
                <span className="text-emerald-700 font-bold shrink-0">➔ Đến:</span>
                <b className="text-emerald-900 font-bold break-words">{order.taskPlot || order.destination || 'Chưa chỉ định lô'}</b>
              </div>
            </div>
            <div className="text-[11.5px] text-slate-600 flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{formatDateTime(order.departureTime)}</span>
              </span>
              <span className="text-slate-300">•</span>
              <span>Thời lượng: <b className="text-slate-900 font-bold">{durationHours} giờ</b></span>
            </div>
          </div>

          {/* Cột 4: Dự toán nhiên liệu */}
          <div className="space-y-1.5 sm:pl-3 pt-3 sm:pt-0">
            <div className="text-[11px] font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-purple-600" />
              <span>Dự toán nhiên liệu</span>
            </div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-black text-purple-900">
                {order.plannedFuelLiters ? `${order.plannedFuelLiters} Lít` : '—'}
              </span>
              {order.fuelQuotaRate && (
                <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  {order.fuelQuotaRate}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-600 leading-snug">
              Tự động tính: <b>{durationHours}h</b> × Định mức xe máy{order.fuelQuotaRate ? ` (${order.fuelQuotaRate})` : ''}
            </div>
          </div>
        </div>

        {/* Ghi chú chỉ đạo (dòng mỏng nếu có) */}
        {(planNotes || taskNotes || rawNotes) && (
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
            <FileText className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed">
              <b>Chỉ đạo & Ghi chú:</b> {planNotes ? `[Kế hoạch]: ${planNotes} • ` : ''}{taskNotes ? `[Chi tiết]: ${taskNotes}` : rawNotes}
            </div>
          </div>
        )}
      </div>

      {/* 4. KHUNG ĐIỀU PHỐI / TỔ MÁY THI CÔNG (COMPACT) */}
      <div className="space-y-3">
        {/* Khung thao tác điều phối phân công */}
        <WorkflowActionPanel
          key={order.id}
          kind={order.orderCategory === 'CONG_TRINH' ? 'CONSTRUCTION' : order.orderCategory === 'VAN_CHUYEN' ? 'TRANSPORT' : 'AGRICULTURE'}
          step={workflowStep}
          taskName={order.purpose}
          vehicleCode={order.vehicle?.code}
          driverName={order.driver?.fullName}
          implementName={order.implement?.name}
          estimatedVehiclesCount={1}
          initialAssignedVehicles={order.vehicle?.code ? [order.vehicle.code] : []}
          currentOrderId={order.id}
          recommendationWorkOrderId={order.operationalWorkOrder?.id}
          initialStartTime={order.departureTime}
          initialDurationHours={durationHours}
          unit={order.unit}
          complexCode={(order as any).complexCode || (order as any).productionOrder?.plan?.complexCode || 'KOUN_MOM'}
          managementUnitId={(order as any).operationalWorkOrder?.managementUnitId}
          onVehicleScheduleChange={handleVehicleScheduleChange}
          onApprove={async (vehicle, driver, schedule, implement, team) => {
            try {
              const payload = {
                vehicleId: vehicle.id,
                driverId: driver.id,
                ...(typeof implement?.id === 'number' && implement.id < 90_000 ? { implementId: implement.id } : {}),
                departureTime: schedule.startTime,
                plannedEndTime: schedule.endTime,
              };
              if (order.orderCategory === 'VAN_CHUYEN') {
                const realId = order.id > 200_000 ? order.id - 200_000 : order.id;
                await operationsApi.assignTransport(realId, payload);
              } else {
                const implementIds = (team?.[0]?.implements ?? [])
                  .map((item) => item.id)
                  .filter((id): id is number => typeof id === 'number' && id < 90_000);
                await operationsApi.assignDispatch(order.id, { ...payload, implementIds });
              }

              const vRate = vehicle.fuelQuotaRate ?? getVehicleFuelQuotaRate(vehicle as any, order.orderCategory);
              const calcFuel = Number((schedule.durationHours * vRate).toFixed(1));

              setOrder((current) => current ? {
                ...current,
                status: 'ASSIGNED',
                vehicle: { id: vehicle.id, code: vehicle.code, name: vehicle.name, status: 'CHO_PHAN_CONG' as any },
                driver: { id: driver.id, fullName: driver.name, licenseClass: driver.license },
                implement: implement ? { id: implement.id, code: implement.code, name: implement.name } : order.implement,
                departureTime: schedule.startTime,
                plannedEndTime: schedule.endTime,
                plannedFuelLiters: calcFuel,
                fuelQuotaRate: `${vRate} L/h`,
              } : current);

              useAppStore.getState().setHeaderAlert({
                type: 'success',
                message: `Đã phê duyệt và phân công phương tiện ${vehicle.code} cho lệnh ${order.code} thành công!`,
              });
            } catch (err: any) {
              console.error('Phê duyệt điều xe thất bại:', err);
              const body = err?.response?.data;
              const details = body?.message?.reasons ?? body?.reasons ?? body?.message?.message;
              const reasonText = Array.isArray(details)
                ? details.map((item: any) => item.message).filter(Boolean).join('; ')
                : typeof details === 'string' ? details : typeof body?.message === 'string' ? body.message : err?.message || 'Không thể phê duyệt lệnh.';
              useAppStore.getState().setHeaderAlert({
                type: 'error',
                message: `Phê duyệt điều xe thất bại: ${reasonText}`,
              });
            }
          }}
        />
      </div>

      {/* ===================== MODAL: DỜI LỊCH LỆNH ĐIỀU XE ===================== */}
      <Modal
        isOpen={rescheduleOpen}
        onClose={() => { setRescheduleOpen(false); setActionError(''); }}
        title={`Dời lịch lệnh điều xe: ${order.code}`}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
            <b>Lưu ý nghiệp vụ:</b> Nếu Xe/Tài xế đã gán bị trùng lịch với khung giờ mới, hệ thống sẽ tự động chuyển về trạng thái <b>Chờ phân công</b>.
          </div>

          <label className="block">
            <span className="mb-1 block font-bold text-slate-700">⏰ Thời gian xuất phát mới <span className="text-red-500">*</span></span>
            <input
              type="datetime-local"
              value={rescheduleForm.newDepartureTime}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, newDepartureTime: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-bold text-slate-700">⏱ Thời gian kết thúc ca mới <span className="text-red-500">*</span></span>
            <input
              type="datetime-local"
              value={rescheduleForm.newPlannedEndTime}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, newPlannedEndTime: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-bold text-slate-700">📝 Lý do dời lịch</span>
            <input
              type="text"
              value={rescheduleForm.reason}
              onChange={(e) => setRescheduleForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="VD: Thời tiết mưa lớn, chờ vật tư, đổi lịch nông trường..."
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {actionError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 font-medium text-red-700">{actionError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={() => { setRescheduleOpen(false); setActionError(''); }}>
              Hủy
            </Button>
            <Button onClick={handleConfirmReschedule} disabled={actionSaving}>
              {actionSaving ? 'Đang lưu...' : 'Xác nhận Dời lịch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL: NGHIỆM THU HỒI TỐ ===================== */}
      <Modal
        isOpen={retroOpen}
        onClose={() => { setRetroOpen(false); setActionError(''); }}
        title={`Nghiệm thu hồi tố: ${order.code}`}
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800">
            <b>Dùng khi:</b> Lệnh đã được xe máy thực hiện thực tế nhưng chưa kịp ghi nhận trên hệ thống. Lệnh sẽ chuyển thẳng sang trạng thái <b>Đã đóng</b>.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-bold text-slate-700">🕐 Giờ bắt đầu thực tế <span className="text-red-500">*</span></span>
              <input
                type="datetime-local"
                value={retroForm.actualStartTime}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualStartTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-slate-700">🕔 Giờ hoàn thành thực tế <span className="text-red-500">*</span></span>
              <input
                type="datetime-local"
                value={retroForm.actualCompletedTime}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualCompletedTime: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-bold text-slate-700">⚙️ Giờ máy thực tế (giờ)</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={retroForm.actualMachineHours}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualMachineHours: e.target.value }))}
                placeholder="VD: 8"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-bold text-slate-700">📦 Khối lượng thực tế ({order.workVolumeUnit || 'Ha'})</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={retroForm.actualQuantity}
                onChange={(e) => setRetroForm((f) => ({ ...f, actualQuantity: e.target.value }))}
                placeholder="VD: 25"
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-bold text-slate-700">📝 Ghi chú nghiệm thu</span>
            <textarea
              rows={2}
              value={retroForm.notes}
              onChange={(e) => setRetroForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="VD: Đã nghiệm thu hoàn tất ngoài thực địa, thợ máy ký nhận..."
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {actionError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 font-medium text-red-700">{actionError}</p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={() => { setRetroOpen(false); setActionError(''); }}>
              Hủy
            </Button>
            <Button onClick={handleConfirmRetroactive} disabled={actionSaving}>
              {actionSaving ? 'Đang lưu...' : 'Xác nhận Nghiệm thu'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL: HỦY LỆNH ĐIỀU XE ===================== */}
      <Modal
        isOpen={cancelOpen}
        onClose={() => { setCancelOpen(false); setActionError(''); }}
        title={`Xác nhận hủy lệnh điều xe: ${order.code}`}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={actionSaving}>
              Đóng
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleConfirmCancel()}
              disabled={actionSaving}
            >
              {actionSaving ? 'Đang xử lý...' : 'Xác nhận hủy lệnh'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-rose-900 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>Cảnh báo chuyển trạng thái lệnh</span>
            </div>
            Thao tác này sẽ chuyển lệnh điều xe <b>{order.code}</b> thành <b>LỆNH ĐÃ HỦY</b> và tự động giải phóng phương tiện / thợ lái về trạng thái Chờ phân công. Lịch sử và nguyên nhân hủy sẽ được lưu vết đầy đủ trong hệ thống.
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-500">Mục đích / Công việc:</span>
              <span className="font-bold text-slate-800 text-right">{order.purpose}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phương tiện điều động:</span>
              <span className="font-bold text-slate-800">{order.vehicle?.code || 'Chưa gán xe'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thợ lái / Tài xế:</span>
              <span className="font-bold text-slate-800">{order.driver?.fullName || 'Chưa gán tài xế'}</span>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block font-bold text-slate-800">
              Nguyên nhân hủy lệnh <span className="text-rose-600">*</span>
            </span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                'Thời tiết không thuận lợi (mưa lớn / ngập úng)',
                'Kế hoạch sản xuất nông trường thay đổi',
                'Phương tiện / thiết bị phát sinh sự cố kỹ thuật',
                'Thợ lái xin nghỉ đột xuất / thiếu nhân sự',
                'Lệnh tạo thử nghiệm / trùng lặp',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setCancelReason(suggestion)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    cancelReason === suggestion
                      ? 'bg-rose-100 border-rose-400 text-rose-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                if (actionError) setActionError('');
              }}
              placeholder="Nhập hoặc chọn nguyên nhân hủy lệnh điều xe..."
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {actionError && (
            <div className="rounded-xl bg-red-100 border border-red-300 p-2.5 text-red-800 font-medium">
              {actionError}
            </div>
          )}
        </div>
      </Modal>

      {/* ===================== MODAL: XEM TRƯỚC VÀ IN LỆNH ĐIỀU XE A4 ===================== */}
      <Modal
        isOpen={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        title="Mẫu phiếu Lệnh Điều Xe Cơ Giới Sản Xuất"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-xs text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
            {/* Header phiếu in */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">TẬP ĐOÀN THACO AGRI</div>
                <div className="text-sm font-extrabold text-slate-900">{order.complexName || 'KHU LIÊN HỢP SNOUL'} - {order.enterpriseName || 'XÍ NGHIỆP CHUỐI ERC'}</div>
                <div className="text-xs text-slate-600">Đơn vị: <b>{order.farmName || order.unit || 'Nông trường 1'}</b></div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-600">Mẫu số: 01/LDX-CG</div>
                <div className="text-sm font-mono font-extrabold text-primary">{order.code}</div>
                <div className="text-[11px] text-slate-500">Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
              </div>
            </div>

            {/* Tiêu đề chính */}
            <div className="text-center my-4 space-y-1">
              <h2 className="text-lg font-black uppercase text-slate-900 tracking-wide">
                LỆNH ĐIỀU ĐỘNG XE MÁY & CƠ GIỚI SẢN XUẤT
              </h2>
              <div className="text-xs italic text-slate-600">
                {order.planCode ? `(Thuộc Kế hoạch tuần: ${order.planCode} - ${order.planTitle || 'Kế hoạch sản xuất'})` : '(Lệnh tạo trực tiếp, không thuộc kế hoạch tuần)'}
              </div>
            </div>

            {/* Bảng thông tin tác nghiệp */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-600">Hạng mục công việc:</span>
                  <div className="font-bold text-slate-900 text-sm">{order.taskJobName || order.purpose}</div>
                </div>
                <div>
                  <span className="text-slate-600">Vị trí Lô thửa tác nghiệp:</span>
                  <div className="font-bold text-slate-900 text-sm">{order.origin} ➔ {order.taskPlot || order.destination}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-10">STT</th>
                      <th className="p-2.5 text-left">Phương tiện / Mã xe</th>
                      <th className="p-2.5 text-left">Thợ lái / Vận hành</th>
                      <th className="p-2.5 text-left">Thiết bị / Nông cụ</th>
                      <th className="p-2.5 text-center">Khung giờ ca</th>
                      <th className="p-2.5 text-right">Dự toán dầu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.assignedTeamDetails && order.assignedTeamDetails.length > 0 ? (
                      order.assignedTeamDetails.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-mono font-bold text-emerald-800">{t.vehicleCode}</td>
                          <td className="p-2.5 font-semibold text-slate-800">{t.driverName}</td>
                          <td className="p-2.5 text-slate-700">{t.implementName || 'Xe tự hành'}</td>
                          <td className="p-2.5 text-center text-slate-600">{t.durationHours || 8} giờ</td>
                          <td className="p-2.5 text-right font-bold text-purple-800">
                            {order.fuelQuotaRate ? `${Number(((t.durationHours || 8) * parseFloat(order.fuelQuotaRate)).toFixed(1))} L` : '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 text-center font-bold text-slate-500">1</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-800">{order.vehicle?.code || 'Chưa ấn định'}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{order.driver?.fullName || 'Chưa gán thợ lái'}</td>
                        <td className="p-2.5 text-slate-700">{order.implement?.name || 'Theo nhóm máy'}</td>
                        <td className="p-2.5 text-center text-slate-600">{durationHours} giờ</td>
                        <td className="p-2.5 text-right font-bold text-purple-800">
                          {order.plannedFuelLiters ? `${order.plannedFuelLiters} L` : '—'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-slate-600">Khối lượng giao khoán:</span>
                  <b className="ml-1 text-slate-900 font-bold">{order.workVolumeTarget ? `${order.workVolumeTarget} ${order.workVolumeUnit || 'Ha'}` : 'Theo ca điều độ'}</b>
                </div>
                <div className="text-right">
                  <span className="text-slate-600">Tổng dự toán nhiên liệu cấp:</span>
                  <b className="ml-1 text-purple-900 font-black text-sm">{order.plannedFuelLiters ? `${order.plannedFuelLiters} Lít` : 'Theo định mức ca'}</b>
                </div>
              </div>

              {/* Chữ ký xác nhận */}
              <div className="grid grid-cols-3 gap-2 pt-8 text-center">
                <div>
                  <div className="font-bold text-slate-900">NGƯỜI LẬP LỆNH</div>
                  <div className="text-[11px] text-slate-500 italic">(Ký, họ tên)</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">ĐIỀU ĐỘ VIÊN CƠ GIỚI</div>
                  <div className="text-[11px] text-slate-500 italic">(Ký, họ tên)</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">THỢ VẬN HÀNH / LÁI XE</div>
                  <div className="text-[11px] text-slate-500 italic">(Ký, họ tên)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <Button variant="outline" onClick={() => setPrintPreviewOpen(false)}>
              Đóng
            </Button>
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
              In phiếu ngay
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
