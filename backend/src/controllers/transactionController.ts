import { Request, Response } from "express";
import { transactionService } from '../services/transaction.service.js';
import catchAsync from '../utils/catchAsync.js';

export const getAllTransactions = catchAsync(
  async (req: Request, res: Response) => {
    const filters = {
      client_id: req.query.client_id as string,
      status: req.query.status as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    };

    const result = await transactionService.findAll(filters);

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

export const getTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const transaction = await transactionService.findById(req.params.id);

    res.status(200).json({
      status: "success",
      data: { transaction },
    });
  }
);

export const createTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const transaction = await transactionService.create(req.body);

    res.status(201).json({
      status: "success",
      data: { transaction },
    });
  }
);

export const updateTransaction = catchAsync(
  async (req: Request, res: Response) => {
    const transaction = await transactionService.update(
      req.params.id,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: { transaction },
    });
  }
);

export const sendReceipt = catchAsync(async (req: Request, res: Response) => {
  const { method, recipient } = req.body;

  // This would integrate with email/SMS service
  // For now, just return success
  res.status(200).json({
    status: "success",
    message: `Receipt sent via ${method} to ${recipient}`,
  });
});
