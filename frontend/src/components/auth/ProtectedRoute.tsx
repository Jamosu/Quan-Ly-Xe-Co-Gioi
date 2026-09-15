import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSessionToken } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const token = getSessionToken();
  const currentUser = useAppStore((s) => s.currentUser);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Tài xế chỉ có quyền đăng nhập App Tài xế (/mobile/driver), không được phép đăng nhập Web
  if (currentUser?.role === 'DRIVER') {
    return <Navigate to="/login" state={{ from: location, driverBlocked: true }} replace />;
  }

  return children ? <>{children}</> : null;
};
