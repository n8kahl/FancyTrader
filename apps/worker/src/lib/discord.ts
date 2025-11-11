type AlertKind =
  | "SCANNER_HEALTH"
  | "SESSION_TRANSITION"
  | "RATE_LIMIT"
  | "CIRCUIT_EVENT"
  | "ERROR";

export async function sendDiscordAlert(
  opts: {
    url?: string;
    enabled: boolean;
    kind: AlertKind;
    title: string;
    fields?: Record<string, any>;
  },
  retry = { max: 3, base: 200, timeout: 3000 }
) {
  if (!opts.enabled || !opts.url) return;
  const body = {
    username: "FancyTrader Worker",
    embeds: [
      {
        title: opts.title,
        fields: Object.entries(opts.fields || {}).map(([name, value]) => ({
          name,
          value: String(value),
          inline: true,
        })),
      },
    ],
  };
  let attempt = 0;
  while (true) {
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), retry.timeout);
      const res = await fetch(opts.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`discord ${res.status}`);
      return;
    } catch (e) {
      if (attempt >= retry.max) throw e;
      const delay = Math.floor(retry.base * 2 ** attempt + Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }
}
