import { z } from "zod";

const schema = z.object({
  VITE_BACKEND_URL: z.string().url().optional(),
  VITE_BACKEND_WS_URL: z.string().url().optional(),
  VITE_DEMO_USER_ID: z.string().optional(),
  VITE_STATUS_BANNER: z.string().optional(),
});

export type ClientEnv = z.infer<typeof schema>;

export const clientEnv: ClientEnv = (() => {
  // @ts-ignore
  const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error("Invalid client environment configuration:\n" + issues.join("\n"));
  }
  return parsed.data;
})();
