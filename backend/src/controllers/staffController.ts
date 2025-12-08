import { Request, Response } from "express";
import { staffService } from "../services/staff.service";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/appError";

export const getAllStaff = catchAsync(async (req: Request, res: Response) => {
  const filters = {
    role: req.query.role as string,
    status: req.query.status as string,
    search: req.query.search as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 50,
  };

  const result = await staffService.findAll(filters);

  res.status(200).json({
    status: "success",
    data: result,
  });
});

export const getStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await staffService.findById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { staff },
  });
});

export const createStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await staffService.create(req.body);

  res.status(201).json({
    status: "success",
    data: { staff },
  });
});

export const updateStaff = catchAsync(async (req: Request, res: Response) => {
  const staff = await staffService.update(req.params.id, req.body);

  res.status(200).json({
    status: "success",
    data: { staff },
  });
});

export const deleteStaff = catchAsync(async (req: Request, res: Response) => {
  await staffService.delete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

export const getStaffPerformance = catchAsync(
  async (req: Request, res: Response) => {
    const period =
      (req.query.period as string) || new Date().toISOString().slice(0, 7);
    const performance = await staffService.getPerformance(
      req.params.id,
      period
    );

    res.status(200).json({
      status: "success",
      data: { performance },
    });
  }
);
