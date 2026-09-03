import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogType } from '@prisma/client';

@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  private readonly templateFiles: Record<string, string> = {
    COMPANY: 'Template__CongTy.xlsx',
    COMPLEX: 'Template__KhuLienHop.xlsx',
    DEPARTMENT: 'Template__PhongBan.xlsx',
    ENTERPRISE: 'Template__XiNghiep.xlsx',
    FARM: 'Template__Nongtruong.xlsx',
    TEAM: 'Template__Doi.xlsx',
    PLOT: 'Template__Lo.xlsx',
    LAND_PARCEL: 'Template__Thua.xlsx',
    VEHICLE: 'Template_Import_Ho_So_Xe_THACO_AGRI.xlsx',
    IMPLEMENT: 'Template_Import_Thiet_Bi_Nong_Cu_THACO_AGRI.xlsx',
    ASSIGNMENT: 'Template_Import_Phan_Bo_Dieu_Chuyen_THACO_AGRI.xlsx',
    DRIVER: 'Template_Import_Ho_So_Lai_Xe_THACO_AGRI.xlsx',
    POSITION: 'Template__ChucDanh.xlsx',
  };

  getTemplate(type: string) {
    const normalizedType = type.trim().toUpperCase();
    const primaryName = this.templateFiles[normalizedType];
    if (!primaryName) {
      throw new NotFoundException(`Không có file mẫu cho danh mục ${type}`);
    }

    const candidateFilenames = [
      primaryName,
      primaryName.replace('.xlsx', '.xls'),
      primaryName.replace('.xls', '.xlsx'),
    ];

    let fullPath: string | undefined;
    let finalFilename = primaryName;

    for (const fn of candidateFilenames) {
      const found = [
        join(process.cwd(), 'FileTemplate_mau', fn),
        join(process.cwd(), 'backend', 'FileTemplate_mau', fn),
        join(__dirname, '..', '..', '..', 'FileTemplate_mau', fn),
        join(__dirname, '..', '..', 'FileTemplate_mau', fn),
      ].find((candidate) => existsSync(candidate));
      if (found) {
        fullPath = found;
        finalFilename = fn;
        break;
      }
    }

    if (!fullPath) {
      throw new NotFoundException(`Không tìm thấy file mẫu ${primaryName}`);
    }
    let size: number;
    try {
      size = statSync(fullPath).size;
    } catch {
      throw new NotFoundException(`Không tìm thấy file mẫu ${primaryName}`);
    }

    return {
      filename: finalFilename,
      size,
      contentType: finalFilename.endsWith('.xls')
        ? 'application/vnd.ms-excel'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      stream: createReadStream(fullPath),
    };
  }

  // --------------------------------------------------------------------------
  // 1. CATALOG ITEMS (COMPLEX, DEPARTMENT, ENTERPRISE, FARM, TEAM, PLOT, LAND_PARCEL)
  // --------------------------------------------------------------------------
  async findAll(type?: CatalogType, search?: string, parentCode?: string) {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (parentCode && parentCode !== 'ALL') {
      where.OR = [
        { parentCode },
        { parentName: { contains: parentCode } },
      ];
    }
    if (search) {
      const searchCondition = [
        { code: { contains: search } },
        { name: { contains: search } },
        { parentName: { contains: search } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }
    return this.prisma.catalogItem.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.catalogItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy danh mục có ID ${id}`);
    }
    return item;
  }

  async create(data: any) {
    const id = data.id || `CAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    return this.prisma.catalogItem.upsert({
      where: { id },
      update: {
        code: data.code,
        name: data.name,
        type: data.type as CatalogType,
        parentCode: data.parentCode || null,
        parentName: data.parentName || null,
        enterpriseName: data.enterpriseName || null,
        farmName: data.farmName || null,
        plotStatus: data.plotStatus || null,
        systemId: data.systemId || null,
        address: data.address || null,
        managerName: data.managerName || null,
        phone: data.phone || null,
        areaHa: data.areaHa !== undefined && data.areaHa !== null ? Number(data.areaHa) : null,
        status: data.status || 'HOAT_DONG',
        description: data.description || null,
        createdUser: data.createdUser || 'admin',
        createdDate: data.createdDate || null,
        updatedUser: data.updatedUser || 'admin',
        updatedDate: data.updatedDate || null,
      },
      create: {
        id,
        code: data.code,
        name: data.name,
        type: data.type as CatalogType,
        parentCode: data.parentCode || null,
        parentName: data.parentName || null,
        enterpriseName: data.enterpriseName || null,
        farmName: data.farmName || null,
        plotStatus: data.plotStatus || null,
        systemId: data.systemId || null,
        address: data.address || null,
        managerName: data.managerName || null,
        phone: data.phone || null,
        areaHa: data.areaHa !== undefined && data.areaHa !== null ? Number(data.areaHa) : null,
        status: data.status || 'HOAT_DONG',
        description: data.description || null,
        createdUser: data.createdUser || 'admin',
        createdDate: data.createdDate || new Date().toISOString().slice(0, 10),
        updatedUser: data.updatedUser || 'admin',
        updatedDate: data.updatedDate || new Date().toISOString().slice(0, 10),
      },
    });
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.catalogItem.findUnique({ where: { id } });
    if (!existing) {
      return this.create({ ...data, id });
    }

    return this.prisma.catalogItem.update({
      where: { id },
      data: {
        code: data.code !== undefined ? data.code : existing.code,
        name: data.name !== undefined ? data.name : existing.name,
        type: data.type !== undefined ? (data.type as CatalogType) : existing.type,
        parentCode: data.parentCode !== undefined ? data.parentCode : existing.parentCode,
        parentName: data.parentName !== undefined ? data.parentName : existing.parentName,
        enterpriseName: data.enterpriseName !== undefined ? data.enterpriseName : existing.enterpriseName,
        farmName: data.farmName !== undefined ? data.farmName : existing.farmName,
        plotStatus: data.plotStatus !== undefined ? data.plotStatus : existing.plotStatus,
        systemId: data.systemId !== undefined ? data.systemId : existing.systemId,
        address: data.address !== undefined ? data.address : existing.address,
        managerName: data.managerName !== undefined ? data.managerName : existing.managerName,
        phone: data.phone !== undefined ? data.phone : existing.phone,
        areaHa: data.areaHa !== undefined ? (data.areaHa !== null ? Number(data.areaHa) : null) : existing.areaHa,
        status: data.status !== undefined ? data.status : existing.status,
        description: data.description !== undefined ? data.description : existing.description,
        updatedUser: data.updatedUser || 'admin',
        updatedDate: new Date().toISOString().slice(0, 10),
      },
    });
  }

  async delete(id: string) {
    try {
      return await this.prisma.catalogItem.delete({
        where: { id },
      });
    } catch (err) {
      throw new NotFoundException(`Không thể xóa danh mục có ID ${id}`);
    }
  }

  async bulkSync(type: CatalogType, items: any[]) {
    if (!Array.isArray(items)) {
      throw new BadRequestException('Dữ liệu đồng bộ phải là một mảng!');
    }
    if (items.length === 0) {
      throw new BadRequestException('File import không có dòng dữ liệu hợp lệ!');
    }

    const normalizedItems = items.map((item, index) => {
      const code = String(item.code || '').trim();
      const name = String(item.name || '').trim();
      if (!code || !name) {
        throw new BadRequestException(`Dòng ${index + 1} thiếu mã hoặc tên danh mục`);
      }
      return { ...item, code, name };
    });

    const duplicateCodes = normalizedItems
      .map((item) => item.code.toLocaleUpperCase('vi-VN'))
      .filter((code, index, all) => all.indexOf(code) !== index);
    if (duplicateCodes.length > 0) {
      throw new BadRequestException(
        `File import có mã trùng: ${[...new Set(duplicateCodes)].join(', ')}`,
      );
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const savedItems = [];
      for (const item of normalizedItems) {
        const existing = await tx.catalogItem.findFirst({
          where: { type, code: item.code },
          orderBy: { createdAt: 'asc' },
        });
        const id = existing?.id || item.id || `CAT-${type}-${item.code}`;
        const sharedData = {
          code: item.code,
          name: item.name,
          type,
          parentCode: item.parentCode || null,
          parentName: item.parentName || null,
          enterpriseName: item.enterpriseName || null,
          farmName: item.farmName || null,
          plotStatus: item.plotStatus || null,
          systemId: item.systemId || null,
          address: item.address || null,
          managerName: item.managerName || null,
          phone: item.phone || null,
          areaHa: item.areaHa !== undefined && item.areaHa !== null ? Number(item.areaHa) : null,
          status: item.status || 'HOAT_DONG',
          description: item.description || null,
          updatedUser: item.updatedUser || 'admin',
          updatedDate: new Date().toISOString().slice(0, 10),
        };
        const saved = existing
          ? await tx.catalogItem.update({ where: { id }, data: sharedData })
          : await tx.catalogItem.create({
              data: {
                id,
                ...sharedData,
                createdUser: item.createdUser || 'admin',
                createdDate: item.createdDate || new Date().toISOString().slice(0, 10),
              },
            });
        savedItems.push(saved);
      }
      return savedItems;
    });

    return { count: results.length, data: results };
  }

  // --------------------------------------------------------------------------
  // 2. COMPANIES
  // --------------------------------------------------------------------------
  async findAllCompanies() {
    return this.prisma.companyEntity.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createCompany(data: any) {
    return this.prisma.companyEntity.create({
      data: {
        code: data.code,
        name: data.name,
        address: data.address || '',
        field: data.field || '',
        businessLicense: data.businessLicense || '',
        charterCapital: data.charterCapital || '',
      },
    });
  }

  async updateCompany(id: number, data: any) {
    return this.prisma.companyEntity.update({
      where: { id: Number(id) },
      data: {
        code: data.code,
        name: data.name,
        address: data.address,
        field: data.field,
        businessLicense: data.businessLicense,
        charterCapital: data.charterCapital,
      },
    });
  }

  async deleteCompany(id: number) {
    return this.prisma.companyEntity.delete({
      where: { id: Number(id) },
    });
  }

  async bulkSyncCompanies(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('File import công ty không có dòng dữ liệu hợp lệ!');
    }
    const normalizedItems = items.map((item, index) => {
      const code = String(item.code || '').trim();
      const name = String(item.name || '').trim();
      if (!code || !name) {
        throw new BadRequestException(`Dòng ${index + 1} thiếu mã hoặc tên công ty`);
      }
      return { ...item, code, name };
    });
    const duplicateCodes = normalizedItems
      .map((item) => item.code.toLocaleUpperCase('vi-VN'))
      .filter((code, index, all) => all.indexOf(code) !== index);
    if (duplicateCodes.length > 0) {
      throw new BadRequestException(
        `File import có mã công ty trùng: ${[...new Set(duplicateCodes)].join(', ')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of normalizedItems) {
        const saved = await tx.companyEntity.upsert({
          where: { code: item.code },
          update: {
            code: item.code,
            name: item.name,
            address: item.address || '',
            field: item.field || '',
            businessLicense: item.businessLicense || '',
            charterCapital: item.charterCapital || '',
          },
          create: {
            code: item.code,
            name: item.name,
            address: item.address || '',
            field: item.field || '',
            businessLicense: item.businessLicense || '',
            charterCapital: item.charterCapital || '',
          },
        });
        results.push(saved);
      }
      return results;
    });
  }

  // --------------------------------------------------------------------------
  // 3. EMPLOYEES
  // --------------------------------------------------------------------------
  async findAllEmployees() {
    return this.prisma.employeeRecord.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async createEmployee(data: any) {
    return this.prisma.employeeRecord.create({
      data: {
        empCode: data.empCode,
        fullName: data.fullName,
        businessUnit: data.businessUnit,
        complex: data.complex,
        enterprise: data.enterprise,
        farm: data.farm,
        team: data.team,
        position: data.position,
        licenseClass: data.licenseClass,
        licenseNumber: data.licenseNumber,
        licenseExpiryDate: data.licenseExpiryDate,
        healthCheckExpiryDate: data.healthCheckExpiryDate,
        status: data.status || 'Hoạt động',
        username: data.username,
        phone: data.phone,
        email: data.email,
        joinedDate: data.joinedDate,
        idCardNumber: data.idCardNumber,
        idCardIssueDate: data.idCardIssueDate,
        idCardIssuePlace: data.idCardIssuePlace,
        taxCode: data.taxCode,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        salaryGrade: data.salaryGrade,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : null,
        coefficients: data.coefficients ? Number(data.coefficients) : null,
        insuranceSalary: data.insuranceSalary ? Number(data.insuranceSalary) : null,
        allowancesJson: data.allowancesJson || data.allowances || null,
      },
    });
  }

  async updateEmployee(id: number, data: any) {
    return this.prisma.employeeRecord.update({
      where: { id: Number(id) },
      data: {
        empCode: data.empCode,
        fullName: data.fullName,
        businessUnit: data.businessUnit,
        complex: data.complex,
        enterprise: data.enterprise,
        farm: data.farm,
        team: data.team,
        position: data.position,
        licenseClass: data.licenseClass,
        licenseNumber: data.licenseNumber,
        licenseExpiryDate: data.licenseExpiryDate,
        healthCheckExpiryDate: data.healthCheckExpiryDate,
        status: data.status,
        username: data.username,
        phone: data.phone,
        email: data.email,
        joinedDate: data.joinedDate,
        idCardNumber: data.idCardNumber,
        idCardIssueDate: data.idCardIssueDate,
        idCardIssuePlace: data.idCardIssuePlace,
        taxCode: data.taxCode,
        bankAccount: data.bankAccount,
        bankName: data.bankName,
        salaryGrade: data.salaryGrade,
        baseSalary: data.baseSalary ? Number(data.baseSalary) : null,
        coefficients: data.coefficients ? Number(data.coefficients) : null,
        insuranceSalary: data.insuranceSalary ? Number(data.insuranceSalary) : null,
        allowancesJson: data.allowancesJson || data.allowances || null,
      },
    });
  }

  async deleteEmployee(id: number) {
    return this.prisma.employeeRecord.delete({
      where: { id: Number(id) },
    });
  }

  async bulkSyncEmployees(items: any[]) {
    const results = [];
    for (const item of items) {
      const existing = await this.prisma.employeeRecord.findUnique({
        where: { empCode: item.empCode },
      });
      if (existing) {
        const updated = await this.updateEmployee(existing.id, item);
        results.push(updated);
      } else {
        const created = await this.createEmployee(item);
        results.push(created);
      }
    }
    return results;
  }

  // --------------------------------------------------------------------------
  // 4. PERSONNEL / PARTNERS
  // --------------------------------------------------------------------------
  async findAllPersonnel() {
    return this.prisma.personnelRecord.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async createPersonnel(data: any) {
    return this.prisma.personnelRecord.create({
      data: {
        code: data.code,
        name: data.name,
        complex: data.complex,
        enterprise: data.enterprise,
        farm: data.farm,
        team: data.team,
        position: data.position,
        status: data.status || 'Hoạt động',
        creator: data.creator || 'admin',
        updater: data.updater || 'admin',
      },
    });
  }

  async updatePersonnel(id: number, data: any) {
    return this.prisma.personnelRecord.update({
      where: { id: Number(id) },
      data: {
        code: data.code,
        name: data.name,
        complex: data.complex,
        enterprise: data.enterprise,
        farm: data.farm,
        team: data.team,
        position: data.position,
        status: data.status,
        updater: data.updater || 'admin',
      },
    });
  }

  async deletePersonnel(id: number) {
    return this.prisma.personnelRecord.delete({
      where: { id: Number(id) },
    });
  }

  async bulkSyncPersonnel(items: any[]) {
    const results = [];
    for (const item of items) {
      const existing = await this.prisma.personnelRecord.findUnique({
        where: { code: item.code },
      });
      if (existing) {
        const updated = await this.updatePersonnel(existing.id, item);
        results.push(updated);
      } else {
        const created = await this.createPersonnel(item);
        results.push(created);
      }
    }
    return results;
  }
}
