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
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  return {
    startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined,
    endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
  };
}
