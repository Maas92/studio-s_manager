import { Router } from "express";
import * as treatmentController from "../controllers/treatmentController.js";
import { extractUser, restrictTo } from "../middleware/userMiddleware.js";
import { validate, validateUUID } from "../middleware/validation.js";
import {
  createTreatmentSchema,
  updateTreatmentSchema,
} from "../validators/treatment.validator.js";

const router = Router();

router.use(extractUser);

// list + read
router.get("/", treatmentController.getAllTreatments);
router.get("/:id", validateUUID("id"), treatmentController.getTreatment);

// create/update/delete with validation + RBAC
router.post(
  "/",
  validate(createTreatmentSchema),
  restrictTo("admin", "manager"),
  treatmentController.createTreatment
);
router.patch(
  "/:id",
  validateUUID("id"),
  validate(updateTreatmentSchema),
  restrictTo("admin", "manager"),
  treatmentController.updateTreatment
);
router.delete(
  "/:id",
  validateUUID("id"),
  restrictTo("admin"),
  treatmentController.deleteTreatment
);

export default router;
