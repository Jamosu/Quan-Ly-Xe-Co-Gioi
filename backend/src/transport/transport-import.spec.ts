import { Role, RouteType, Unit } from '@prisma/client';
import { TransportService } from './transport.service';

describe('TransportService import preview', () => {
  it('groups merged trip rows and preserves two item lines', async () => {
    const prisma = {
      vehicle: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findFirst: jest.fn().mockResolvedValue(null) },
      agriculturalImplement: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new TransportService(prisma as never, {} as never);
    const result = await service.previewImport({
      fileName: 'transport.xlsx', sheetName: 'Sheet1', checksum: 'a'.repeat(64),
      merges: ['D2:D3', 'E2:E3', 'F2:F3', 'G2:G3'],
      rows: [
        { rowNumber: 1, values: ['STT','NGÀY YÊU CẦU VC','NGÀY TH VẬN CHUYỂN','THỜI GIAN XUẤT PHÁT','SỐ XE','SỐ CONT','TÀI XẾ VẬN HÀNH','HÌNH THỨC VẬN CHUYỂN','TRẠNG THÁI','GHI CHÚ','MÃ VẬT TƯ','HÀNG HÓA','ĐVT','KẾ HOẠCH SỐ LƯỢNG','NƠI NHẬN HÀNG','NƠI GIAO HÀNG'] },
        { rowNumber: 2, values: [1,'17/08/2026','17/08/2026','07:00','92C-14749','92R-00446','Phan Văn Hưng','Đối lưu','24 Palet','Mang thanh chắn','CHUOI-XK','Chuối thành phẩm','Thùng',1300,'DP1','DP Tổng kho'] },
        { rowNumber: 3, values: [2,'17/08/2026','17/08/2026',null,null,null,null,null,null,null,'BB-0263','Đáy thùng chuối','Cái',6400,'XĐG LP1','LP1'] },
      ],
    }, { id: 1, role: Role.DISPATCHER, unit: Unit.BAN_CO_GIOI });
    expect(result.canCommit).toBe(true);
    expect(result.tripCount).toBe(1);
    expect(result.itemCount).toBe(2);
    expect(result.trips[0].routeType).toBe(RouteType.TWO_WAY);
    expect(result.trips[0].palletCount).toBe(24);
  });
});
