import { Router } from "express";
import {
  createClient,
  searchClients,
} from "../controllers/clientController.js";

const router = Router();

router.post("/", createClient);
router.get("/", searchClients);

export default router;
