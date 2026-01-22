import { Request, Response } from "express";
import { staffKPIService } from "../services/staffKPI.service.js";
import catchAsync from "../utils/catchAsync.js";

export const getStaffKPIs = catchAsync(async (req: Request, res: Response) => {
  const { staffId } = req.params;
  const filters = {
    month: req.query.month as string,
    status: req.query.status as string,
  };

  const kpis = await staffKPIService.findByStaffId(staffId, filters);

  res.status(200).json({
    status: "success",
    data: { kpis },
  });
});

export const getKPI = catchAsync(async (req: Request, res: Response) => {
  const kpi = await staffKPIService.findById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { kpi },
  });
});

export const createKPI = catchAsync(async (req: Request, res: Response) => {
  const kpi = await staffKPIService.create(req.body);

  res.status(201).json({
    status: "success",
    data: { kpi },
  });
});

export const updateKPI = catchAsync(async (req: Request, res: Response) => {
  const kpi = await staffKPIService.update(req.params.id, req.body);

  res.status(200).json({
    status: "success",
    data: { kpi },
  });
});

export const deleteKPI = catchAsync(async (req: Request, res: Response) => {
  await staffKPIService.delete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getKPISummary = catchAsync(async (req: Request, res: Response) => {
  const { staffId } = req.params;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const summary = await staffKPIService.getSummary(staffId, year);

  res.status(200).json({
    status: "success",
    data: { summary },
  });
});
