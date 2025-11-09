export type EnvCtx = { role?: string; flags?: Record<string, boolean> };

export function allows(when: Record<string, unknown> | undefined, ctx: EnvCtx): boolean {
  if (!when) return true;
  const feature = when["feature"];
  if (feature && !ctx.flags?.[String(feature)]) {
    return false;
  }
  const roles = when["roleIn"];
  if (Array.isArray(roles) && roles.length > 0) {
    return Boolean(ctx.role && roles.includes(ctx.role));
  }
  return true;
}
