import { render, screen } from '@testing-library/react';
import { StatusBadge, ViewSwitcher } from './OperationUi';
import userEvent from '@testing-library/user-event';

describe('operation UI', () => {
  it('renders canonical status label', () => { render(<StatusBadge status="PENDING_APPROVAL"/>); expect(screen.getByText('Chờ duyệt')).toBeInTheDocument(); });
  it('changes view from a controlled switcher', async () => { const onChange = vi.fn(); render(<ViewSwitcher value="calendar" options={[{ value: 'calendar', label: 'Lịch' }, { value: 'table', label: 'Bảng' }]} onChange={onChange}/>); await userEvent.click(screen.getByText('Bảng')); expect(onChange).toHaveBeenCalledWith('table'); });
});
