import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './SearchableSelect';

describe('SearchableSelect', () => {
  it('keeps unavailable options visible but prevents selecting them', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 20, y: 20, top: 20, left: 20, right: 340, bottom: 56, width: 320, height: 36,
      toJSON: () => ({}),
    });
    const onChange = vi.fn();
    render(
      <SearchableSelect
        value=""
        onChange={onChange}
        allowCustomInput={false}
        options={[
          { value: 'BUSY', label: '🔴 Xe đang bận', disabled: true, title: 'Trùng lệnh LDX-01' },
          { value: 'FREE', label: '🟢 Xe sẵn sàng' },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole('textbox'));
    const busy = await screen.findByText('🔴 Xe đang bận');
    expect(busy.closest('[aria-disabled="true"]')).toBeInTheDocument();
    await userEvent.click(busy);
    expect(onChange).not.toHaveBeenCalledWith('BUSY');

    await userEvent.click(screen.getByText('🟢 Xe sẵn sàng'));
    expect(onChange).toHaveBeenCalledWith('FREE');
  });
});
