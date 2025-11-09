import axios from "axios";

const MASSIVE_BASE_URL = "https://api.massive.com";
const API_KEY = process.env.MASSIVE_API_KEY || "";

if (!API_KEY) {
  console.error("MASSIVE_API_KEY is missing");
}

export const massive = axios.create({
  baseURL: MASSIVE_BASE_URL,
  timeout: 15000,
});

function withKey(params?: Record<string, any>) {
  return { ...(params || {}), apiKey: API_KEY };
}

export async function universalSnapshot(tickers: string[]) {
  return massive.get("/v3/snapshot", {
    params: withKey({ "ticker.any_of": tickers.join(",") }),
  });
}

export async function optionsSnapshotForUnderlying(underlying: string) {
  return massive.get(`/v3/snapshot/options/${encodeURIComponent(underlying)}` , {
    params: withKey(),
  });
}

export async function optionsSnapshotForContract(underlying: string, contract: string) {
  const clean = contract.startsWith("O:") ? contract.slice(2) : contract;
  return massive.get(
    `/v3/snapshot/options/${encodeURIComponent(underlying)}/${encodeURIComponent(clean)}`,
    {
      params: withKey(),
    }
  );
}

export async function optionQuote(optionsTicker: string) {
  return massive.get(`/v3/quotes/${encodeURIComponent(optionsTicker)}` , {
    params: withKey(),
  });
}

export function logAxiosError(context: string, err: any) {
  const status = err?.response?.status;
  const data = err?.response?.data;
  console.error(`[massive] ${context} failed`, { status, data });
  throw err;
}

export default massive;
