export const OCC_RE = /^[A-Z]{1,6}\d{6}[CP]\d{8}$/;

export type TickerKind = "index" | "option_contract" | "option_underlying" | "unsupported";

export function classify(t: string): TickerKind {
  if (t.startsWith("I:")) return "index";
  if (OCC_RE.test(t)) return "option_contract";
  if (/^[A-Z]{1,6}$/.test(t)) return "option_underlying";
  return "unsupported";
}
