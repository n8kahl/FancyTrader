import { Express, Request, Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  AnnotationCreateSchema,
  AnnotationUpdateSchema,
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  updateAnnotation,
} from "../services/annotationService.js";

const querySchema = z.object({
  symbol: z
    .string()
    .min(1)
    .transform((value) => value.toUpperCase())
    .optional(),
});

const missingUserResponse = {
  error: "Missing userId (x-user-id header or ?userId=)",
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const resolveUserId = (req: Request): string | null => {
  const header = req.header("x-user-id");
  if (isNonEmptyString(header)) {
    return header.trim();
  }
  const query = req.query.userId;
  if (isNonEmptyString(query)) {
    return query.trim();
  }
  if (Array.isArray(query)) {
    const first = query.find(isNonEmptyString);
    if (first) {
      return first.trim();
    }
  }
  return null;
};

export function setupChartAnnotationsRoutes(app: Express): void {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const owner = resolveUserId(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }

      const parsedQuery = querySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        res.status(400).json({ error: parsedQuery.error.flatten() });
        return;
      }

      const records = await listAnnotations(owner, parsedQuery.data.symbol);
      res.json({ annotations: records });
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const owner = resolveUserId(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }

      const body = AnnotationCreateSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: body.error.flatten() });
        return;
      }

      const created = await createAnnotation(owner, body.data);
      res.status(201).json({ annotation: created });
    })
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const owner = resolveUserId(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }

      const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
      const body = AnnotationUpdateSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: body.error.flatten() });
        return;
      }

      const updated = await updateAnnotation(owner, id, body.data);
      if (!updated) {
        res.status(404).json({ error: "Annotation not found" });
        return;
      }

      res.json({ annotation: updated });
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const owner = resolveUserId(req);
      if (!owner) {
        res.status(400).json(missingUserResponse);
        return;
      }

      const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
      const removed = await deleteAnnotation(owner, id);
      if (!removed) {
        res.status(404).json({ error: "Annotation not found" });
        return;
      }

      res.json({ ok: true, id });
    })
  );

  app.use("/api/chart/annotations", router);
}
