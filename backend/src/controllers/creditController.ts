import { Response, NextFunction } from "express";
import { UserRequest } from "../middleware/userMiddleware.js";
import { creditService } from "../services/credit.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { Result } from "pg";

/**
 * Get client credit balance
 */
export const getClientBalance = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { clientId } = req.params;

    const balance = await creditService.getBalance(userId, clientId);

    res.status(200).json({
      status: "success",
      data: { balance },
    });
  },
);

/**
 * Get client credit history
 */
export const getClientHistory = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { clientId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const history = await creditService.getHistory(userId, clientId, limit);

    res.status(200).json({
      status: "success",
      data: { history },
    });
  },
);

/**
 * Get client credit summary
 */
export const getClientSummary = catchAsync(
  async (req: UserRequest, res: Response) => {
    const userId = req.user?.id ?? "";
    const { clientId } = req.params;

    const summary = await creditService.getSummary(userId, clientId);

    res.status(200).json({
      status: "success",
      data: { summary },
    });
  },
);

/**
 * Add credit to client account
 */
export const addCredit = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const {
      clientId,
      amount,
      sourceType,
      sourceTransactionId,
      notes,
      expiresAt,
    } = req.body;

    if (!clientId || !amount || amount <= 0) {
      return next(
        AppError.badRequest("Client ID and positive amount required"),
      );
    }

    const result = await creditService.addCredit(
      userId,
      {
        clientId,
        amount: parseFloat(amount),
        sourceType,
        sourceTransactionId,
        notes,
      },
      userId,
    );

    res.status(201).json({
      status: "success",
      data: result,
    });
  },
);

/**
 * Redeem credit from client account
 */
export const redeemCredit = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const { clientId, amount, sourceTransactionId, notes } = req.body;

    if (!clientId || !amount || amount <= 0) {
      return next(
        AppError.badRequest("Client ID and positive amount required"),
      );
    }

    const result = await creditService.redeemCredit(
      userId,
      {
        clientId,
        amount: parseFloat(amount),
        sourceTransactionId,
        notes,
      },
      userId,
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

/**
 * Adjust credit balance (manual)
 */
export const adjustCredit = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const { clientId, amount, notes } = req.body;

    if (!clientId || !amount || amount === 0) {
      return next(
        AppError.badRequest("Client ID and non-zero amount required"),
      );
    }

    if (!notes) {
      return next(AppError.badRequest("Notes required for manual adjustments"));
    }

    const result = await creditService.setCreditBalance(
      userId,
      clientId,
      parseFloat(amount),
      notes,
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  },
);

/**
 * Get clients with credit balances
 */
export const getClientsWithCredit = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const clients = await creditService.getClientsWithCredit(userId);
    res.status(200).json({
      status: "success",
      data: { clients },
    });
  },
);
