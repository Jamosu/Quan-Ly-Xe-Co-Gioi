import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import request = require('supertest');
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationConfirmationsController } from './operation-confirmations.controller';
import { OperationConfirmationsService } from './operation-confirmations.service';

describe('OperationConfirmationsController (HTTP)', () => {
  let app: INestApplication;
  const service = {
    findAll: jest.fn().mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 2, limit: 10, totalPages: 0 },
    }),
    create: jest.fn(),
    confirm: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [OperationConfirmationsController],
      providers: [{ provide: OperationConfirmationsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: 7, role: Role.DISPATCHER, unit: 'BAN_CO_GIOI' };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns the stable items/pagination contract and passes the actor', async () => {
    await request(app.getHttpServer())
      .get('/operation-confirmations?page=2&limit=10')
      .expect(200)
      .expect({ items: [], pagination: { total: 0, page: 2, limit: 10, totalPages: 0 } });

    expect(service.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10 }),
      expect.objectContaining({ id: 7, role: Role.DISPATCHER, unit: 'BAN_CO_GIOI' }),
    );
  });

  it('rejects an invalid enum query before the service is called', async () => {
    service.findAll.mockClear();
    await request(app.getHttpServer())
      .get('/operation-confirmations?status=UNKNOWN')
      .expect(400);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});
