import { Request, Response, NextFunction } from "express";
import { UserRequest } from "../middleware/userMiddleware.js";
import { clientService } from "../services/client.service.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import {
  createClientSchema,
  searchClientSchema,
  updateClientSchema,
} from "../validators/client.validator.js";

/**
 * Create new client
 * POST /api/v1/clients
 */
export const createClient = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = createClientSchema.safeParse(req);
    if (!validation.success) {
      return next(
        new AppError((validation.error as any).errors[0].message, 400)
      );
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const client = await clientService.create(validation.data.body, userId);

      res.status(201).json({
        status: "success",
        data: {
          client,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all clients with pagination
 * GET /api/v1/clients
 */
export const getAllClients = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const filters = {
      search: req.query.q as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
    };

    const userId = req.user?.id ?? "";
    const result = await clientService.findAll(userId, filters);

    res.status(200).json({
      status: "success",
      results: result.clients.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: {
        clients: result.clients,
      },
    });
  }
);

/**
 * Search clients (for autocomplete/quick search)
 * GET /api/v1/clients/search
 */
export const searchClients = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const validation = searchClientSchema.safeParse(req);
    if (!validation.success) {
      return next(new AppError("Invalid search parameters", 400));
    }

    const { q } = validation.data.query;

    if (!q) {
      return res.status(200).json({
        status: "success",
        data: {
          clients: [],
        },
      });
    }

    const userId = req.user?.id ?? "";

    const clients = await clientService.search(userId, q);

    res.status(200).json({
      status: "success",
      data: {
        clients,
      },
    });
  }
);

/**
 * Get client by ID with full details
 * GET /api/v1/clients/:id
 */
export const getClient = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const client = await clientService.findById(userId, req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        client,
      },
    });
  }
);

/**
 * Update client
 * PATCH /api/v1/clients/:id
 */
export const updateClient = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const validation = updateClientSchema.safeParse(req);
    if (!validation.success) {
      return next(
        new AppError((validation.error as any).errors[0].message, 400)
      );
    }

    const userId = req.user?.id ?? "";

    const client = await clientService.update(
      userId,
      req.params.id,
      validation.data.body
    );

    res.status(200).json({
      status: "success",
      data: {
        client,
      },
    });
  }
);

/**
 * Get client history (appointments and purchases)
 * GET /api/v1/clients/:id/history
 */
export const getClientHistory = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    const history = await clientService.getHistory(userId, req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        history,
      },
    });
  }
);

/**
 * Get client statistics
 * GET /api/v1/clients/:id/stats
 */
export const getClientStats = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";

    const stats = await clientService.getStats(userId, req.params.id);

    res.status(200).json({
      status: "success",
      data: {
        stats,
      },
    });
  }
);

/**
 * Delete/deactivate client
 * DELETE /api/v1/clients/:id
 */
export const deleteClient = catchAsync(
  async (req: UserRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? "";
    await clientService.delete(userId, req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
