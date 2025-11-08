import { apiClient } from "../services/apiClient";
import { wsClient } from "../services/websocketClient";
import { toast } from "sonner";
import { logger } from "../utils/logger";
import type { BackendConnectionDependencies } from "./backendConnectionDeps";

export const backendConnectionDefaults: BackendConnectionDependencies = {
  apiClient,
  wsClient,
  toast,
  logger,
};
