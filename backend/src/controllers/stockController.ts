import { Request, Response } from "express";
import { stockService } from "../services/stock.service";
import catchAsync from "../utils/catchAsync";

export const getAllStockItems = catchAsync(
  async (req: Request, res: Response) => {
    const filters = {
      location: req.query.location as any,
      category: req.query.category as string,
      low_stock: req.query.low_stock === "true",
      search: req.query.search as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await stockService.findAll(filters);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

export const getStockItem = catchAsync(async (req: Request, res: Response) => {
  const item = await stockService.findById(req.params.id);

  res.status(200).json({
    status: "success",
    data: { item },
  });
});

export const createStockItem = catchAsync(
  async (req: Request, res: Response) => {
    const item = await stockService.create(req.body);

    res.status(201).json({
      status: "success",
      data: { item },
    });
  }
);

export const updateStockItem = catchAsync(
  async (req: Request, res: Response) => {
    const item = await stockService.update(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: { item },
    });
  }
);

export const deleteStockItem = catchAsync(
  async (req: Request, res: Response) => {
    await stockService.delete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

export const transferStock = catchAsync(async (req: Request, res: Response) => {
  const result = await stockService.transfer(req.body);

  res.status(200).json({
    status: "success",
    data: result,
  });
});
