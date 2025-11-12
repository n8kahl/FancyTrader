import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { serverEnv } from "@fancytrader/shared/env.server";
import { MassiveClient } from "@fancytrader/shared/client/massive";

const qSchema = z.object({
  underlying: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  page: z.string().optional(),
});

function createMassive(): MassiveClient {
  if (!serverEnv.MASSIVE_API_KEY || !serverEnv.MASSIVE_REST_BASE) {
    throw new Error("Missing MASSIVE_API_KEY or MASSIVE_REST_BASE");
  }
  return new MassiveClient({
    baseUrl: serverEnv.MASSIVE_REST_BASE,
    apiKey: serverEnv.MASSIVE_API_KEY,
    timeoutMs: 10_000,
    maxRetries: 5,
  });
}

export const optionsRouter = Router();

optionsRouter.get("/contracts", async (req: Request, res: Response) => {
  const parsed = qSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { underlying, limit, page } = parsed.data;
  try {
    const massive = createMassive();
    const data = await massive.getOptionsChain({ underlying, limit, page });
    res.json(data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    res.status(status).json({ error: e?.message ?? "options_chain_failed" });
  }
});

export default optionsRouter;
