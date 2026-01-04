import { Request, Response, NextFunction } from "express";
import { transactionService } from "../services/transaction.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================
const cartItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["product", "treatment", "appointment"]),
  name: z.string(),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  productId: z.string().uuid().optional(),
  treatmentId: z.string().uuid().optional(),
  appointmentId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  staffName: z.string().optional(),
  discount: z.number().min(0).optional(),
});

const discountSchema = z.object({
  type: z.enum(["percentage", "fixed", "none"]),
  value: z.number().min(0),
  reason: z.string().optional(),
});

const paymentSchema = z.object({
  method: z.string(),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

const createTransactionSchema = z.object({
  clientId: z.string().uuid().optional(),
  clientName: z.string().optional(),
  items: z.array(cartItemSchema).min(1),
  discount: discountSchema,
  payments: z.array(paymentSchema).min(1),
  tips: z.record(z.string(), z.number()).optional(),
  loyaltyPointsRedeemed: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * GET /api/transactions
 * List all transactions with filtering
 */
export const listTransactions = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      clientId,
      status,
      paymentStatus,
      dateFrom,
      dateTo,
      page = "1",
      limit = "50",
    } = req.query;

    const result = await transactionService.findAll({
      clientId: clientId as string,
      status: status as string,
      paymentStatus: paymentStatus as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.status(200).json({
      status: "success",
      data: result,
    });
  }
);

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
export const getTransaction = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const transaction = await transactionService.findById(id);

    res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  }
);

/**
 * POST /api/transactions
 * Create a new transaction (complete a sale)
 */
export const createTransaction = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate input
    const validation = createTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return next(
        new AppError(
          validation.error.issues[0]?.message || "Invalid input",
          400
        )
      );
    }

    const data = validation.data;

    // Validate that client exists if clientId provided
    if (data.clientId && !data.clientName) {
      // Optional: verify client exists
      // const client = await clientService.findById(data.clientId);
    }

    // Validate walk-in has name
    if (!data.clientId && !data.clientName) {
      return next(
        new AppError("Either clientId or clientName is required", 400)
      );
    }

    // Get current user from auth (you'll need to implement auth middleware)
    const createdBy = (req as any).user?.id || "system";

    // Create transaction
    const transaction = await transactionService.create({
      ...data,
      createdBy,
    });

    res.status(201).json({
      status: "success",
      data: {
        transaction,
      },
    });
  }
);

/**
 * PATCH /api/transactions/:id/status
 * Update transaction status
 */
export const updateTransactionStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(new AppError("Status is required", 400));
    }

    const validStatuses = ["pending", "completed", "cancelled", "refunded"];
    if (!validStatuses.includes(status)) {
      return next(
        new AppError(`Status must be one of: ${validStatuses.join(", ")}`, 400)
      );
    }

    const transaction = await transactionService.updateStatus(id, status);

    res.status(200).json({
      status: "success",
      data: {
        transaction,
      },
    });
  }
);

/**
 * GET /api/transactions/stats
 * Get transaction statistics
 */
export const getTransactionStats = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { dateFrom, dateTo } = req.query;

    const stats = await transactionService.getStats({
      dateFrom: dateFrom as string,
      dateTo: dateTo as string,
    });

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  }
);

/**
 * POST /api/transactions/:id/receipt
 * Send receipt via email or SMS
 */
export const sendReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { method, recipient } = req.body;

    if (!method || !recipient) {
      return next(new AppError("Method and recipient are required", 400));
    }

    if (!["email", "sms"].includes(method)) {
      return next(new AppError("Method must be 'email' or 'sms'", 400));
    }

    // Get transaction
    const transaction = await transactionService.findById(id);

    // TODO: Implement receipt sending logic
    // await emailService.sendReceipt(transaction, recipient);
    // or
    // await smsService.sendReceipt(transaction, recipient);

    res.status(200).json({
      status: "success",
      message: `Receipt sent via ${method} to ${recipient}`,
    });
  }
);

/**
 * GET /api/transactions/:id/receipt
 * Generate printable receipt (PDF)
 */
export const printReceipt = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    // Get transaction
    const transaction = await transactionService.findById(id);

    // TODO: Implement PDF generation
    // const pdf = await pdfService.generateReceipt(transaction);
    // res.setHeader('Content-Type', 'application/pdf');
    // res.setHeader('Content-Disposition', `attachment; filename="receipt-${id}.pdf"`);
    // return res.send(pdf);

    res.status(200).json({
      status: "success",
      message: "Receipt generation not yet implemented",
      data: { transaction },
    });
  }
);
