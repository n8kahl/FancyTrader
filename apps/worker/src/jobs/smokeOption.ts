import { optionContractSnapshot, optionQuote } from "../clients/massive.js";

function getUnderlyingFromContract(occ: string) {
  const m = occ.match(/^([A-Z]{1,6})\d{6}[CP]\d{8}$/);
  if (!m) throw new Error(`Not an OCC option: ${occ}`);
  return m[1];
}

function summarize(obj: any) {
  const last =
    obj?.last ?? obj?.price ?? obj?.close ?? obj?.result?.last ?? obj?.p;
  const bid = obj?.bid ?? obj?.b;
  const ask = obj?.ask ?? obj?.a;
  const iv =
    obj?.iv ??
    obj?.implied_volatility ??
    obj?.option?.implied_volatility ??
    obj?.greeks?.iv;
  return { last, bid, ask, iv };
}

export async function smokeOption(contract: string) {
  const underlying = getUnderlyingFromContract(contract);
  try {
    const snap = await optionContractSnapshot(underlying, contract);
    console.log("[smoke] snapshot", contract, summarize(snap));
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404) {
      const q = await optionQuote(contract);
      console.log("[smoke] quote", contract, summarize(q));
      return;
    }
    const url = e?.response?.config?.url;
    const params = e?.response?.config?.params;
    console.error("[smoke] failed", {
      contract,
      status,
      url,
      params,
      data: e?.response?.data ?? e?.message,
    });
  }
}
