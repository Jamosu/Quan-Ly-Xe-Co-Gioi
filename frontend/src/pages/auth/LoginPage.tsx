import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Lock,
  UserPlus,
  User,
  Shield,
  Smartphone,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Loader2,
  ExternalLink,
  Tractor,
  Truck,
  Gauge,
  Fuel,
  Wrench,
  MapPin,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { apiClient, setSessionAuth, clearSessionAuth } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface WebAccount {
  id: string;
  roleType: 'ADMIN' | 'MANAGER';
  roleLabel: string;
  username: string;
  fullName: string;
  klhName: string;
  klhCode: string;
}

const WEB_ACCOUNTS: WebAccount[] = [
  {
    id: 'acc-admin',
    roleType: 'ADMIN',
    roleLabel: 'Quản trị viên (Admin)',
    username: 'admin',
    fullName: 'Quản Trị Viên Hệ Thống',
    klhName: 'Toàn bộ 3 Khu Liên Hợp',
    klhCode: 'ALL',
  },
  {
    id: 'acc-manager',
    roleType: 'MANAGER',
    roleLabel: 'Nhân sự quản lý (Manager)',
    username: 'quanly.kounmom',
    fullName: 'Lê Văn Hùng',
    klhName: 'KLH Koun Mom',
    klhCode: 'KOUN_MOM',
  },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setSelectedKLH = useAppStore((s) => s.setSelectedKLH);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [driverBlockedModal, setDriverBlockedModal] = useState<{
    show: boolean;
    fullName?: string;
    username?: string;
    driverCode?: string;
  }>({ show: false });

  const redirectUrl = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if ((location.state as any)?.driverBlocked) {
      clearSessionAuth();
      setErrorMessage(
        'Tài khoản tài xế chỉ có quyền đăng nhập trên App Mobile Lái xe, không được phép truy cập cổng Web.'
      );
    }
  }, [location]);

  const performLogin = async (loginUser: string, loginPass: string, klhCode?: string) => {
    setLoading(true);
    setErrorMessage('');

    const cleanUser = loginUser.trim().toLowerCase();

    // 1. Chặn ngay nếu tên đăng nhập thuộc tài khoản tài xế
    if (cleanUser.startsWith('tx.') || cleanUser.includes('driver.') || cleanUser.includes('lai_xe')) {
      setLoading(false);
      clearSessionAuth();
      setDriverBlockedModal({
        show: true,
        fullName: 'Tài xế cơ giới',
        username: loginUser,
      });
      return;
    }

    try {
      const res = await apiClient.post('/auth/login', {
        username: loginUser.trim(),
        password: loginPass,
      });

      const data = res.data?.data || res.data;
      if (!data?.accessToken) {
        throw new Error('Máy chủ không trả về token xác thực.');
      }

      // 2. Kiểm tra vai trò trả về từ server: nếu là DRIVER -> Chặn đăng nhập Web
      if (data?.user?.role === 'DRIVER') {
        clearSessionAuth();
        setDriverBlockedModal({
          show: true,
          fullName: data.user.fullName || 'Tài xế cơ giới',
          username: data.user.username,
          driverCode: data.user.code,
        });
        return;
      }

      // Xác định KLH tự động theo tài khoản
      const targetKLH =
        klhCode ||
        (loginUser.includes('snoul')
          ? 'SNOUL'
          : loginUser.includes('namlao')
          ? 'NAM_LAO'
          : loginUser.includes('kounmom')
          ? 'KOUN_MOM'
          : 'ALL');

      setSessionAuth(data.accessToken, {
        ...data.user,
        complexCode: targetKLH,
      });

      if (targetKLH) {
        setSelectedKLH(targetKLH);
      }

      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      // Offline fallback cho 2 tài khoản web nếu server gặp sự cố
      const matchedWeb = WEB_ACCOUNTS.find(
        (a) =>
          a.username.toLowerCase() === cleanUser &&
          (loginPass === 'Thaco@1234$' || loginPass === '123' || loginPass === '123456')
      );

      if (
        matchedWeb &&
        (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error'))
      ) {
        const targetKLH = klhCode || matchedWeb.klhCode;
        setSessionAuth('demo-session-token-' + matchedWeb.id, {
          id: matchedWeb.id,
          username: matchedWeb.username,
          fullName: matchedWeb.fullName,
          role: matchedWeb.roleType === 'ADMIN' ? 'SUPER_ADMIN' : 'FARM_MANAGER',
          complexCode: targetKLH,
          assignedUnit: matchedWeb.klhName,
        });
        if (targetKLH) setSelectedKLH(targetKLH);
        navigate(redirectUrl, { replace: true });
        return;
      }

      const msg =
        err.response?.data?.message ||
        err.message ||
        'Tên đăng nhập hoặc mật khẩu không chính xác.';
      setErrorMessage(
        typeof msg === 'string'
          ? msg
          : 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    performLogin(username, password);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white select-none font-sans">
      {/* Left Full-Height Banner Column */}
      <div className="lg:w-[54%] xl:w-[58%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-8 sm:p-12 lg:p-16 relative bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9]/70 to-emerald-50/50 border-b lg:border-b-0 lg:border-r border-slate-200/80 overflow-hidden">
        
        {/* Top Branding Area */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <img
              src="/favicon.png"
              alt="THACO AGRI Logo"
              className="w-12 h-12 rounded-2xl shadow-md object-contain shrink-0"
            />
            <div>
              <div className="font-extrabold text-xl sm:text-2xl text-[#007A33] tracking-tight leading-none">
                THACO AGRI
              </div>
              <div className="text-xs sm:text-sm font-semibold text-slate-500 mt-1 tracking-tight">
                Hệ thống Quản lý Xe Cơ Giới & MMTB
              </div>
            </div>
          </div>

          {/* Large Bold Slogan */}
          <h1 className="mt-8 lg:mt-12 text-3xl sm:text-4xl lg:text-5xl font-black text-[#0f1d40] tracking-tight leading-[1.15]">
            LÀM VIỆC NHANH HƠN.
            <br />
            QUẢN LÝ HIỆU QUẢ HƠN.
          </h1>
          <p className="mt-3 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed font-medium">
            Nền tảng số hóa quản trị đội xe cơ giới, máy nông nghiệp và điều hành vận hành tập trung.
          </p>

          {/* Functional Pillars / Capabilities (No data records) */}
          <div className="mt-6 flex flex-wrap gap-2 sm:gap-2.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <Tractor className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xe & Nông cụ</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Giám sát hành trình</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <Activity className="w-3.5 h-3.5 text-amber-600" />
              <span>Điều phối lệnh xe</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <Wrench className="w-3.5 h-3.5 text-slate-600" />
              <span>Bảo dưỡng kỹ thuật</span>
            </div>
          </div>
        </div>

        {/* Bottom Mint Curved Wave Pattern & Vehicle UI Visual Illustration (No system data) */}
        <div className="relative mt-8 sm:mt-12 h-60 sm:h-72 lg:h-80 w-full flex items-end justify-center overflow-hidden rounded-3xl">
          {/* Mint Green Striped Waves Background */}
          <svg
            className="absolute inset-0 w-full h-full text-[#d2f0df]"
            viewBox="0 0 500 240"
            preserveAspectRatio="none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="mint-stripes-full"
                width="24"
                height="24"
                patternTransform="rotate(25 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="24"
                  stroke="#bbf0cf"
                  strokeWidth="10"
                />
              </pattern>
            </defs>
            {/* Curved hill / wave */}
            <path
              d="M-30 240 C120 120, 320 110, 530 150 L530 240 Z"
              fill="url(#mint-stripes-full)"
              opacity="0.85"
            />
            <path
              d="M-30 240 C140 150, 360 140, 530 180 L530 240 Z"
              fill="#d8f4e2"
              opacity="0.65"
            />
          </svg>

          {/* Stylized Vehicle Management Visual UI Mockup (Concept Art, No specific records) */}
          <div className="relative z-10 flex items-end justify-center pb-5 sm:pb-7 w-full max-w-md px-4 transform hover:scale-[1.02] transition-transform duration-300">
            {/* Back Card: Fleet Operations Blueprint */}
            <div className="w-56 sm:w-68 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 -rotate-6 transform -mr-20 mb-4 sm:mb-6 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-bold text-slate-700">Điều phối cơ giới</span>
                </div>
                <Truck className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="pt-2 space-y-1.5">
                <div className="h-2 w-3/4 rounded-full bg-slate-200/80" />
                <div className="h-2 w-1/2 rounded-full bg-emerald-100" />
              </div>
            </div>

            {/* Front Main Card: Sleek Vehicle Control Interface (Dark Slate & Emerald) */}
            <div className="w-68 sm:w-80 bg-[#1e293b] rounded-2xl shadow-2xl border border-slate-700/80 p-4 sm:p-5 relative overflow-hidden text-white flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Tractor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">Quản lý Xe & Thiết bị</div>
                    <div className="text-[10px] text-slate-400">Fleet Control Portal</div>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              </div>

              {/* Graphical Visual Elements representing vehicle domains */}
              <div className="py-3 grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-center">
                  <Tractor className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                  <span className="text-[10px] font-medium text-slate-300 block">Máy nông nghiệp</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-center">
                  <Truck className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                  <span className="text-[10px] font-medium text-slate-300 block">Xe vận tải</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/50 text-center">
                  <Wrench className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                  <span className="text-[10px] font-medium text-slate-300 block">Bảo dưỡng BTSC</span>
                </div>
              </div>

              {/* Status Bar */}
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sẵn sàng kết nối vận hành</span>
                </div>
                <div className="w-12 h-1.5 rounded-full bg-emerald-500/40 overflow-hidden">
                  <div className="w-full h-full bg-emerald-400 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Login Form Column (Full Height) */}
      <div className="lg:w-[46%] xl:w-[42%] min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 bg-white overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-6 sm:py-10">
          {/* Header */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0f1d40] tracking-tight">
              Đăng nhập
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Sử dụng tài khoản quản lý / điều hành để đăng nhập.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Tài khoản
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập (VD: admin, long.ct)"
                  className="w-full bg-[#f0f4f9] hover:bg-[#e9eff6] focus:bg-white text-slate-800 pl-11 pr-4 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#007A33]/30 border border-transparent focus:border-[#007A33] transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-bold text-slate-800">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#f0f4f9] hover:bg-[#e9eff6] focus:bg-white text-slate-800 pl-11 pr-11 py-3 sm:py-3.5 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#007A33]/30 border border-transparent focus:border-[#007A33] transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007A33] focus:ring-[#007A33] border-slate-300"
                />
                <span className="text-xs sm:text-sm font-medium text-slate-600">
                  Ghi nhớ đăng nhập
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  alert('Vui lòng liên hệ Ban Chuyển Đổi Số THACO AGRI để được hỗ trợ cấp lại mật khẩu.')
                }
                className="text-xs sm:text-sm font-bold text-[#007A33] hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#007A33] hover:bg-[#00662a] active:scale-[0.99] text-white font-bold py-3.5 sm:py-4 rounded-xl text-sm sm:text-base transition-all duration-200 shadow-md shadow-emerald-900/15 cursor-pointer flex items-center justify-center gap-2 mt-3 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>

          {/* Divider "hoặc" */}
          <div className="relative flex py-5 sm:py-6 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs text-slate-400 uppercase tracking-wider">
              hoặc
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Quick Login Test Accounts */}
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => {
                setUsername('admin');
                setPassword('123');
                void performLogin('admin', '123', 'ALL');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Đăng nhập tài khoản Admin mẫu"
            >
              <Shield className="w-3.5 h-3.5 text-[#007A33]" />
              <span>Admin mẫu</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsername('quanly.kounmom');
                setPassword('123');
                void performLogin('quanly.kounmom', '123', 'KOUN_MOM');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Đăng nhập tài khoản Quản lý mẫu"
            >
              <User className="w-3.5 h-3.5 text-[#007A33]" />
              <span>Quản lý mẫu</span>
            </button>
            <a
              href="/mobile/driver"
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-[#007A33] hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Mở giao diện App Lái Xe"
            >
              <span>App Lái Xe</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          {/* Support Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">Cần hỗ trợ?</span> Liên hệ Ban Chuyển Đổi Số THACO AGRI để được cấp quyền truy cập.
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="text-center text-xs text-slate-400 mt-6 pt-4 border-t border-slate-100">
          © 2025 THACO AGRI. All rights reserved.
        </div>
      </div>

      {/* Driver Blocked Warning Modal */}
      {driverBlockedModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                Tài Khoản Chỉ Dùng Trên App Mobile
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Tài khoản <b>{driverBlockedModal.username}</b> là tài khoản dành riêng cho{' '}
                <b>Tài xế cơ giới</b> trên Ứng dụng Di động.
                <br />
                Hệ thống <b>không cho phép đăng nhập trên Cổng thông tin Web</b>.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDriverBlockedModal({ show: false })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Đóng lại
              </button>
              <a
                href="/mobile/driver"
                className="flex-1 py-2.5 rounded-xl bg-[#007A33] hover:bg-[#00662a] text-xs font-bold text-white flex items-center justify-center gap-1 transition-colors shadow-xs"
              >
                <span>Mở App Lái Xe</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
