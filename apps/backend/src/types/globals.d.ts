export {};

declare global {
  /** Set to true when WS is fully ready; false when stopped */
  var __WSS_READY__: boolean | undefined;

  /** Epoch millis of the last WS message received */
  var __LAST_MSG_TS__: number | undefined;
}
