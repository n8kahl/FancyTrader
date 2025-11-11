import { Router } from "express";
import { publicConfig } from "../config.js";

const router = Router();
router.get("/configz", (_req, res) => res.status(200).json(publicConfig));

export default router;
