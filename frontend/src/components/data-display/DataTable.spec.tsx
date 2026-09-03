import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';

describe('DataTable server pagination', () => {
  it('renders the server page unchanged and delegates the next page', async () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={[{ key: 'name', title: 'Tên' }]}
        data={[{ id: 21, name: 'Chuyến trang hai' }]}
        serverSide
        controlledPage={2}
        pageSize={20}
        totalItems={45}
        onPageChange={onPageChange}
        showSearch={false}
        showExport={false}
        useGlobalFilters={false}
      />,
    );
    expect(screen.getByText('Chuyến trang hai')).toBeInTheDocument();
    expect(screen.getAllByText('21').length).toBeGreaterThan(0);
    await userEvent.click(screen.getByTitle('Trang sau'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
