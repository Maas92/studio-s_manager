import { Router } from "express";
import {
  createClient,
  getAllClients,
  searchClients,
  getClient,
  updateClient,
  getClientHistory,
  getClientStats,
  deleteClient,
} from "../controllers/clientController.js";
import { restrictTo } from "../middleware/userMiddleware.js";
import { validateUUID } from "../middleware/validation.js";

const router = Router();

// Search endpoint (before /:id to avoid conflicts)
router.get("/search", searchClients);

// CRUD operations
router
  .route("/")
  .get(getAllClients)
  .post(
    restrictTo("admin", "manager", "owner", "receptionist", "therapist"),
    createClient
  );

router
  .route("/:id")
  .get(validateUUID("id"), getClient)
  .patch(
    validateUUID("id"),
    restrictTo("admin", "manager", "owner", "receptionist", "therapist"),
    updateClient
  )
  .delete(
    validateUUID("id"),
    restrictTo("owner", "manager", "admin"),
    deleteClient
  );

// Client history and stats
router.get("/:id/history", validateUUID("id"), getClientHistory);
router.get(
  "/:id/stats",
  validateUUID("id"),
  restrictTo("admin", "owner", "manager"),
  getClientStats
);

export default router;
