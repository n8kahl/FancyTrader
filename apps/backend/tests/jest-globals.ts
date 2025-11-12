const getGlobal = <T extends PropertyKey>(name: T) => {
  const value = (globalThis as any)[name];
  if (!value) {
    throw new Error(`Vitest global '${String(name)}' is not initialized yet`);
  }
  return value;
};

const createLazyCallable = (name: PropertyKey) => {
  const fn = (...args: unknown[]) => getGlobal(name).apply(null, args);
  return new Proxy(fn, {
    get(_target, prop) {
      const value = (getGlobal(name) as any)[prop];
      if (typeof value === "function") {
        return value.bind(getGlobal(name));
      }
      return value;
    },
  });
};

const describe = createLazyCallable("describe");
const it = createLazyCallable("it");

const expect = new Proxy(
  (...args: unknown[]) => getGlobal("expect")(...args),
  {
    get(_, prop) {
      return (getGlobal("expect") as any)[prop];
    },
  }
) as any;

const beforeEach = (...args: unknown[]) => getGlobal("beforeEach")(...args);
const afterEach = (...args: unknown[]) => getGlobal("afterEach")(...args);
const beforeAll = (...args: unknown[]) => getGlobal("beforeAll")(...args);
const afterAll = (...args: unknown[]) => getGlobal("afterAll")(...args);

const getGlobalVi = () => getGlobal("vi") as typeof globalThis.vi;

const vi = new Proxy(
  function (...args: unknown[]) {
    return getGlobalVi().apply(null, args);
  },
  {
    get(_target, prop) {
      const value = (getGlobalVi() as any)[prop];
      if (typeof value === "function") {
        return value.bind(getGlobalVi());
      }
      return value;
    },
  }
) as any;

const jestShim = {
  fn: (...args: Parameters<(typeof vi)["fn"]>) => getGlobalVi().fn(...args),
  spyOn: (...args: Parameters<(typeof vi)["spyOn"]>) => getGlobalVi().spyOn(...args),
  mock: (...args: Parameters<(typeof vi)["mock"]>) => getGlobalVi().mock(...args),
  doMock: (...args: Parameters<(typeof vi)["doMock"]>) => getGlobalVi().doMock(...args),
  resetModules: () => getGlobalVi().resetModules?.(),
  isolateModules: (fn: () => any) => getGlobalVi().isolateModules?.(fn) ?? fn,
  dontMock: (...args: Parameters<(typeof vi)["unmock"]>) => getGlobalVi().unmock?.(...args),
  useFakeTimers: (options?: Parameters<(typeof vi)["useFakeTimers"]>[0]) =>
    getGlobalVi().useFakeTimers(options),
  useRealTimers: () => getGlobalVi().useRealTimers(),
  advanceTimersByTime: (ms: number) => getGlobalVi().advanceTimersByTime(ms),
  runOnlyPendingTimers: () => getGlobalVi().runOnlyPendingTimers?.(),
  requireActual: (name: string) => getGlobalVi().importActual(name),
};

export { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll, vi };
export { jestShim as jest };
