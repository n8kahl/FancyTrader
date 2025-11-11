export function validateEnv() {
  const errs: string[] = [];

  const streamingEnabled = process.env.STREAMING_ENABLED === "true";
  const massiveKey = process.env.MASSIVE_API_KEY?.trim();

  if (streamingEnabled && !massiveKey) {
    errs.push("STREAMING_ENABLED=true but MASSIVE_API_KEY is missing");
  }

  if (errs.length) {
    const message = `Environment validation failed:\n- ${errs.join("\n- ")}`;
    throw new Error(message);
  }
}
