import React from 'react';
import { useLocation } from 'react-router-dom';
import { DispatchOrderForm } from '../../components/dispatch/DispatchOrderForm';

export const CreateDispatchOrderPage: React.FC = () => {
  const location = useLocation();
  return <DispatchOrderForm key={location.key} />;
};

export default CreateDispatchOrderPage;
