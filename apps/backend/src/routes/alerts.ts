import type { Express, Request, Response, NextFunction } from "express";
import { Router } from "express";
import { z } from "zod";
import { alertConditionSchema } from "@fancytrader/shared/cjs";
import { AlertRegistry } from "../alerts/registry";
import { badRequest, notFound } from "../utils/httpError";

const createSchema = z.object({
  symbol: z.string().min(1).transform((value) => value.trim().toUpperCase()),
  condition: alertConditionSchema,
});

export function setupAlertsRoutes(app: Express, registry: AlertRegistry): void {
  const router = Router();

  router.get("/", (_req: Request, res: Response): void => {
    res.json({ alerts: registry.list() });
  });

  router.post("/", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = createSchema.parse(req.body);
      const alert = registry.add(parsed.symbol, parsed.condition);
      res.status(201).json({ id: alert.id });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", (req: Request, res: Response, next: NextFunction): void => {
    try {
      const id = req.params.id;
      if (!id) {
        throw badRequest("Alert id is required");
      }
      if (!registry.remove(id)) {
        throw notFound("Alert not found");
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api/alerts", router);
}
