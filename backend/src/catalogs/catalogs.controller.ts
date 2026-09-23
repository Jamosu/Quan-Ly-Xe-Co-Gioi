import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CatalogsService } from './catalogs.service';
import { CatalogType, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogsService: CatalogsService) {}

  // --------------------------------------------------------------------------
  // Catalog Items
  // --------------------------------------------------------------------------
  @Get()
  async findAll(
    @Query('type') type?: CatalogType,
    @Query('search') search?: string,
    @Query('parentCode') parentCode?: string,
  ) {
    return this.catalogsService.findAll(type, search, parentCode);
  }

  @Get('templates/:type')
  async downloadTemplate(
    @Param('type') type: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const template = this.catalogsService.getTemplate(type);
    response.set({
      'Content-Type': template.contentType,
      'Content-Disposition': `attachment; filename="${template.filename}"`,
      'Content-Length': template.size.toString(),
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(template.stream);
  }

  @Get('item/:id')
  async findOne(@Param('id') id: string) {
    return this.catalogsService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  async create(@Body() body: any) {
    return this.catalogsService.create(body);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() body: any) {
    return this.catalogsService.update(id, body);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  async delete(@Param('id') id: string) {
    return this.catalogsService.delete(id);
  }

  @Post('bulk-sync')
  @Roles(Role.SUPER_ADMIN)
  async bulkSync(@Body() body: { type: CatalogType; items: any[] }) {
    return this.catalogsService.bulkSync(body.type, body.items);
  }

  // --------------------------------------------------------------------------
  // Companies
  // --------------------------------------------------------------------------
  @Get('companies/list')
  async findAllCompanies() {
    return this.catalogsService.findAllCompanies();
  }

  @Post('companies')
  @Roles(Role.SUPER_ADMIN)
  async createCompany(@Body() body: any) {
    return this.catalogsService.createCompany(body);
  }

  @Put('companies/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateCompany(@Param('id') id: string, @Body() body: any) {
    return this.catalogsService.updateCompany(Number(id), body);
  }

  @Delete('companies/:id')
  @Roles(Role.SUPER_ADMIN)
  async deleteCompany(@Param('id') id: string) {
    return this.catalogsService.deleteCompany(Number(id));
  }

  @Post('companies/bulk-sync')
  @Roles(Role.SUPER_ADMIN)
  async bulkSyncCompanies(@Body() body: { items: any[] }) {
    return this.catalogsService.bulkSyncCompanies(body.items);
  }

  // --------------------------------------------------------------------------
  // Employees
  // --------------------------------------------------------------------------
  @Get('employees/list')
  async findAllEmployees() {
    return this.catalogsService.findAllEmployees();
  }

  @Post('employees')
  @Roles(Role.SUPER_ADMIN)
  async createEmployee(@Body() body: any) {
    return this.catalogsService.createEmployee(body);
  }

  @Put('employees/:id')
  @Roles(Role.SUPER_ADMIN)
  async updateEmployee(@Param('id') id: string, @Body() body: any) {
    return this.catalogsService.updateEmployee(Number(id), body);
  }

  @Delete('employees/:id')
  @Roles(Role.SUPER_ADMIN)
  async deleteEmployee(@Param('id') id: string) {
    return this.catalogsService.deleteEmployee(Number(id));
  }

  @Post('employees/bulk-sync')
  @Roles(Role.SUPER_ADMIN)
  async bulkSyncEmployees(@Body() body: { items: any[] }) {
    return this.catalogsService.bulkSyncEmployees(body.items);
  }

  // --------------------------------------------------------------------------
  // Personnel / Partners
  // --------------------------------------------------------------------------
  @Get('personnel/list')
  async findAllPersonnel() {
    return this.catalogsService.findAllPersonnel();
  }

  @Post('personnel')
  @Roles(Role.SUPER_ADMIN)
  async createPersonnel(@Body() body: any) {
    return this.catalogsService.createPersonnel(body);
  }

  @Put('personnel/:id')
  @Roles(Role.SUPER_ADMIN)
  async updatePersonnel(@Param('id') id: string, @Body() body: any) {
    return this.catalogsService.updatePersonnel(Number(id), body);
  }

  @Delete('personnel/:id')
  @Roles(Role.SUPER_ADMIN)
  async deletePersonnel(@Param('id') id: string) {
    return this.catalogsService.deletePersonnel(Number(id));
  }

  @Post('personnel/bulk-sync')
  @Roles(Role.SUPER_ADMIN)
  async bulkSyncPersonnel(@Body() body: { items: any[] }) {
    return this.catalogsService.bulkSyncPersonnel(body.items);
  }
}
