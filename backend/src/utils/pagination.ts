import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    take: limit,
  };
}

export function getSearchQuery(req: Request): string | undefined {
  const search = req.query.search as string | undefined;
  return search?.trim() || undefined;
}

export function getDateRange(req: Request): { startDate?: Date; endDate?: Date } {
  // Accept both legacy (startDate/endDate) and frontend (dateFrom/dateTo) names
  const startRaw = req.query.startDate ?? req.query.dateFrom;
  const endRaw = req.query.endDate ?? req.query.dateTo;

  const startDate = startRaw ? new Date(startRaw as string) : undefined;
  const endDate = endRaw ? new Date(endRaw as string) : undefined;

  return {
    startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined,
    endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
  };
}
