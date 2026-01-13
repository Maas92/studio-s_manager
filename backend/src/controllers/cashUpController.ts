import { Response, NextFunction } from "express";
import { UserRequest } from "../middleware/userMiddleware.js";
import { cashUpService } from "../services/cashUp.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

/**
 * Create new cash-up session
 * POST /api/v1/cash-ups
 */
export const createCashUp = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return next(AppError.unauthorized("User not authenticated"));
    }

    const { openingFloat, sessionDate } = req.body;

    const cashUp = await cashUpService.create(userId, {
      openingFloat: parseFloat(openingFloat) || 0,
      sessionDate: sessionDate || new Date().toISOString().split("T")[0],
    });

    res.status(201).json({
      status: "success",
      data: { cashUp },
    });
  }
);

/**
 * Get all cash-up sessions
 * GET /api/v1/cash-ups
 */
export const getAllCashUps = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const filters = {
      status: req.query.status as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 30,
    };

    const result = await cashUpService.findAll(userId, filters);

    res.status(200).json({
      status: "success",
      results: result.cashUps.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: { cashUps: result.cashUps },
    });
  }
);

/**
 * Get single cash-up session with details
 * GET /api/v1/cash-ups/:id
 */
export const getCashUp = catchAsync(async (req: UserRequest, res: Response) => {
  const userId = req.user?.id ?? "";
  const cashUp = await cashUpService.findById(userId, req.params.id);

  res.status(200).json({
    status: "success",
    data: { cashUp },
  });
});

/**
 * Update cash-up session
 * PATCH /api/v1/cash-ups/:id
 */
export const updateCashUp = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const cashUp = await cashUpService.update(userId, req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: { cashUp },
    });
  }
);

/**
 * Complete cash-up session
 * POST /api/v1/cash-ups/:id/complete
 */
export const completeCashUp = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { actualCash, notes } = req.body;

    const cashUp = await cashUpService.complete(
      userId,
      req.params.id,
      parseFloat(actualCash),
      notes
    );

    res.status(200).json({
      status: "success",
      data: { cashUp },
    });
  }
);

/**
 * Reconcile cash-up (manager approval)
 * POST /api/v1/cash-ups/:id/reconcile
 */
export const reconcileCashUp = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { notes } = req.body;

    const cashUp = await cashUpService.reconcile(userId, req.params.id, notes);

    res.status(200).json({
      status: "success",
      data: { cashUp },
    });
  }
);

/**
 * Add expense
 * POST /api/v1/cash-ups/:id/expenses
 */
export const addExpense = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const expense = await cashUpService.addExpense(
      userId,
      req.params.id,
      req.body
    );

    res.status(201).json({
      status: "success",
      data: { expense },
    });
  }
);

/**
 * Update expense
 * PATCH /api/v1/cash-ups/:id/expenses/:expenseId
 */
export const updateExpense = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const expense = await cashUpService.updateExpense(
      userId,
      req.params.expenseId,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: { expense },
    });
  }
);

/**
 * Delete expense
 * DELETE /api/v1/cash-ups/:id/expenses/:expenseId
 */
export const deleteExpense = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    await cashUpService.deleteExpense(userId, req.params.expenseId);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

/**
 * Upload expense receipt
 * POST /api/v1/cash-ups/:id/expenses/:expenseId/receipt
 */
export const uploadExpenseReceipt = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";

    if (!req.file) {
      return next(AppError.badRequest("No file uploaded"));
    }

    const expense = await cashUpService.uploadReceipt(
      userId,
      req.params.expenseId,
      req.file
    );

    res.status(200).json({
      status: "success",
      data: { expense },
    });
  }
);

/**
 * Add safe drop
 * POST /api/v1/cash-ups/:id/safe-drops
 */
export const addSafeDrop = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const safeDrop = await cashUpService.addSafeDrop(
      userId,
      req.params.id,
      req.body
    );

    res.status(201).json({
      status: "success",
      data: { safeDrop },
    });
  }
);

/**
 * Update safe drop
 * PATCH /api/v1/cash-ups/:id/safe-drops/:dropId
 */
export const updateSafeDrop = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const safeDrop = await cashUpService.updateSafeDrop(
      userId,
      req.params.dropId,
      req.body
    );

    res.status(200).json({
      status: "success",
      data: { safeDrop },
    });
  }
);

/**
 * Delete safe drop
 * DELETE /api/v1/cash-ups/:id/safe-drops/:dropId
 */
export const deleteSafeDrop = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    await cashUpService.deleteSafeDrop(userId, req.params.dropId);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

/**
 * Get cash-up summary/statistics
 * GET /api/v1/cash-ups/summary
 */
export const getCashUpSummary = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { startDate, endDate } = req.query;

    const summary = await cashUpService.getSummary(
      userId,
      startDate as string,
      endDate as string
    );

    res.status(200).json({
      status: "success",
      data: { summary },
    });
  }
);

/**
 * Get daily snapshot (current session)
 * GET /api/v1/cash-ups/daily-snapshot
 */
export const getDailySnapshot = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const snapshot = await cashUpService.getDailySnapshot(userId);

    res.status(200).json({
      status: "success",
      data: { snapshot },
    });
  }
);
