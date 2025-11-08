import { isDev } from "./env";

type LogLevel = "info" | "warn" | "error" | "debug";

const shouldLog = (level: LogLevel): boolean => {
  if (level === "error" || level === "warn") {
    return true;
  }
  return isDev();
};

const emit = (level: LogLevel, message: unknown, rest: unknown[]): void => {
  const target =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : level === "debug"
          ? console.debug
          : console.log;

  target({ level, time: new Date().toISOString(), message, rest });
};

export const logger: {
  debug(msg: unknown, ...rest: unknown[]): void;
  info(msg: unknown, ...rest: unknown[]): void;
  warn(msg: unknown, ...rest: unknown[]): void;
  error(msg: unknown, ...rest: unknown[]): void;
} = {
  info(message, ...rest) {
    if (!shouldLog("info")) return;
    emit("info", message, rest);
  },
  warn(message, ...rest) {
    emit("warn", message, rest);
  },
  error(message, ...rest) {
    emit("error", message, rest);
  },
  debug(message, ...rest) {
    if (!shouldLog("debug")) return;
    emit("debug", message, rest);
  },
};
