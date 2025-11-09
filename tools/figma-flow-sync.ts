#!/usr/bin/env ts-node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FlowName = "trade" | "watchlist" | "alerts" | "onboarding" | "strategies";
type StepMap = Record<string, string[]>;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function bump(version: unknown): number {
  const current = Number(version);
  return Number.isFinite(current) ? current + 1 : 1;
}

function run(flow: FlowName) {
  const figmaFile = path.join(root, `design/figma/${flow}.json`);
  const configFile = path.join(root, `apps/frontend/src/config/${flow}_flow.json`);
  if (!fs.existsSync(figmaFile)) {
    throw new Error(`Missing ${figmaFile}`);
  }
  if (!fs.existsSync(configFile)) {
    throw new Error(`Missing ${configFile}`);
  }

  const fig = JSON.parse(fs.readFileSync(figmaFile, "utf8")) as StepMap;
  const cur = JSON.parse(fs.readFileSync(configFile, "utf8")) as {
    version?: number;
    steps?: Array<{ id: string; actions?: string[] }>;
    [key: string]: unknown;
  };

  const out = { ...cur, version: bump(cur.version) };
  out.steps = (cur.steps ?? []).map((step) =>
    fig[step.id] ? { ...step, actions: fig[step.id] } : step,
  );

  fs.writeFileSync(configFile, JSON.stringify(out, null, 2));
  console.log(`\u2713 Updated ${path.basename(configFile)} to version ${out.version}`);
}

const flowArg = (process.argv.find((arg) => arg.startsWith("--flow=")) || "").split("=")[1];

if (!flowArg) {
  console.error("Usage: pnpm sync:figma-flow --flow=<trade|watchlist|alerts|onboarding|strategies>");
  process.exit(1);
}

run(flowArg as FlowName);
