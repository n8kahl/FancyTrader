import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { EventEmitter } from "events";
import type { IncomingMessage } from "http";
import type { WebSocketServer } from "ws";
import { setupWebSocketHandler } from "../src/websocket/handler";
import type { StrategyDetectorService } from "../src/services/strategyDetector";
import { defaultStrategyParams } from "../src/config/strategy.defaults";
import { logger } from "../src/utils/logger";

class MockWebSocket extends EventEmitter {
  public readonly OPEN = 1;
  public readyState = this.OPEN;
  public sentPayloads: string[] = [];

  send(payload: string): void {
    this.sentPayloads.push(payload);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close");
  }
}

class MockWebSocketServer extends EventEmitter {
  public clients = new Set<MockWebSocket>();

  simulateConnection(client: MockWebSocket, origin = "http://localhost:5173"): void {
    this.clients.add(client);
    const req = { headers: { origin } } as IncomingMessage;
    this.emit("connection", client, req);
  }

  close(): void {
    this.emit("close");
    this.clients.clear();
  }
}

class StrategyDetectorStub extends EventEmitter {
  updateParams = jest.fn();
  getParams = jest.fn().mockReturnValue(defaultStrategyParams);
  getActiveSetups = jest.fn().mockReturnValue([]);
  getSetupsForSymbol = jest.fn().mockReturnValue([]);
  getStats = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

class MockStreamingService extends EventEmitter {
  subscribe = jest.fn();
  unsubscribe = jest.fn();
  start = jest.fn();
  stop = jest.fn();
}

describe("setupWebSocketHandler", () => {
  let wss: MockWebSocketServer;
  let strategyDetector: StrategyDetectorStub;
  let streamingService: MockStreamingService;

  beforeEach(() => {
    jest.useFakeTimers();
    wss = new MockWebSocketServer();
    strategyDetector = new StrategyDetectorStub();
    streamingService = new MockStreamingService();

    setupWebSocketHandler(
      wss as unknown as WebSocketServer,
      { strategyDetector: strategyDetector as unknown as StrategyDetectorService },
      { enableStreaming: false, streamingService }
    );
  });

  afterEach(() => {
    wss.close();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const parseLast = (client: MockWebSocket) => {
    const raw = client.sentPayloads.at(-1);
    return raw ? JSON.parse(raw) : null;
  };

  const resetPayloads = (...clients: MockWebSocket[]) => {
    clients.forEach((client) => {
      client.sentPayloads = [];
    });
  };

  it("registers subscriptions and forwards the server ack", () => {
    const clientA = new MockWebSocket();
    const clientB = new MockWebSocket();
    wss.simulateConnection(clientA);
    wss.simulateConnection(clientB);
    resetPayloads(clientA, clientB);

    clientA.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "SUBSCRIBE", payload: { symbols: ["SPY", "QQQ"] } }))
    );

    expect(streamingService.subscribe).toHaveBeenCalledWith("SPY");
    expect(streamingService.subscribe).toHaveBeenCalledWith("QQQ");
    const ack = parseLast(clientA);
    expect(ack).not.toBeNull();
    expect(ack).toMatchObject({ type: "SUBSCRIPTIONS", symbols: ["SPY", "QQQ"] });
    expect(clientB.sentPayloads).toHaveLength(0);

    clientA.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "UNSUBSCRIBE", payload: { symbols: ["QQQ"] } }))
    );

    expect(streamingService.unsubscribe).toHaveBeenCalledWith("QQQ");
  });

  it("emits consistent broadcast payloads from strategy events", () => {
    const clientA = new MockWebSocket();
    const clientB = new MockWebSocket();
    wss.simulateConnection(clientA);
    wss.simulateConnection(clientB);
    resetPayloads(clientA, clientB);

    const detectedPayload = {
      id: "setup-1",
      symbol: "SPY",
      setupType: "ORB_PC",
      status: "SETUP_READY",
    };

    strategyDetector.emit("setup-detected", detectedPayload);

    const payloadA = parseLast(clientA);
    const payloadB = parseLast(clientB);

    expect(payloadA?.type).toBe("SETUP_UPDATE");
    expect(payloadA?.payload).toMatchObject({ action: "new", setup: detectedPayload });
    expect(payloadB?.type).toBe("SETUP_UPDATE");
  });

  it("sends structured errors when parsing fails", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    client.emit("message", Buffer.from("not-json"));

    const errorPayload = parseLast(client);
    expect(errorPayload).toMatchObject({ type: "ERROR", message: expect.stringContaining("Invalid") });
  });

  it("responds to ping frames", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    client.emit("message", Buffer.from(JSON.stringify({ type: "PING" })));

    const pong = parseLast(client);
    expect(pong?.type).toBe("PONG");
  });

  it("emits heartbeats and prunes idle sockets", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    jest.advanceTimersByTime(15_000);
    expect(client.sentPayloads.some((payload) => JSON.parse(payload).message === "HEARTBEAT")).toBe(true);

    jest.advanceTimersByTime(60_000);
    expect(client.readyState).not.toBe(client.OPEN);
  });

  it("unsubscribes streaming service when clients disconnect with unique symbols", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    client.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "SUBSCRIBE", payload: { symbols: ["AMD"] } }))
    );

    client.close();
    expect(streamingService.unsubscribe).toHaveBeenCalledWith("AMD");
  });

  it("logs Massive start failures without crashing", () => {
    const failingWss = new MockWebSocketServer();
    const failingService = new MockStreamingService();
    failingService.start.mockImplementation(() => {
      throw new Error("offline");
    });
    const logSpy = jest.spyOn(logger, "error").mockImplementation(() => undefined as never);

    setupWebSocketHandler(
      failingWss as unknown as WebSocketServer,
      { strategyDetector: strategyDetector as unknown as StrategyDetectorService },
      { enableStreaming: true, streamingService: failingService }
    );

    expect(failingService.start).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("Failed to connect to Massive", { error: expect.any(Error) });
    logSpy.mockRestore();
    failingWss.close();
  });

  it("handles ArrayBuffer payloads", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    const buffer = Uint8Array.from(Buffer.from(JSON.stringify({ type: "PING" }))).buffer;
    client.emit("message", buffer);

    const pong = parseLast(client);
    expect(pong?.type).toBe("PONG");
  });

  it("refreshes last activity on pong events", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    jest.advanceTimersByTime(30_000);
    client.emit("pong");
    jest.advanceTimersByTime(50_000);

    expect(client.readyState).toBe(client.OPEN);
  });

  it("keeps subscriptions when other clients still listen", () => {
    const clientA = new MockWebSocket();
    const clientB = new MockWebSocket();
    wss.simulateConnection(clientA);
    wss.simulateConnection(clientB);
    resetPayloads(clientA, clientB);

    const payload = Buffer.from(JSON.stringify({ type: "SUBSCRIBE", payload: { symbols: ["MSFT"] } }));
    clientA.emit("message", payload);
    clientB.emit("message", payload);
    streamingService.unsubscribe.mockReset();

    clientA.close();
    expect(streamingService.unsubscribe).not.toHaveBeenCalled();
  });

  it("handles socket errors by closing the client", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    client.emit("error", new Error("boom"));
    expect(client.readyState).not.toBe(client.OPEN);
  });

  it("replays active setups when present", () => {
    strategyDetector.getActiveSetups = jest.fn().mockReturnValueOnce([{ id: "setup-42", symbol: "QQQ" }]);
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    const summaries = client.sentPayloads.filter((payload) => JSON.parse(payload).type === "SETUP_UPDATE");
    expect(summaries).toHaveLength(2);
  });

  it("broadcasts target and stop-loss payloads", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    strategyDetector.emit("target-hit", { id: "t1" });
    expect(parseLast(client)?.payload.action).toBe("target_hit");

    strategyDetector.emit("stop-loss-hit", { id: "sl1" });
    expect(parseLast(client)?.payload.action).toBe("stop_loss");
  });

  it("warns when messages arrive after the client meta is gone", () => {
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => undefined as never);
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    client.close();

    client.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "SUBSCRIBE", payload: { symbols: ["NFLX"] } }))
    );
    expect(warnSpy).toHaveBeenCalledWith("Missing client meta during subscribe");

    client.emit(
      "message",
      Buffer.from(JSON.stringify({ type: "UNSUBSCRIBE", payload: { symbols: ["NFLX"] } }))
    );
    expect(warnSpy).toHaveBeenCalledWith("Missing client meta during unsubscribe");
    warnSpy.mockRestore();
  });

  it("parses array payloads and fallback inputs", () => {
    const client = new MockWebSocket();
    wss.simulateConnection(client);
    resetPayloads(client);

    const bufferChunk = Buffer.from(JSON.stringify({ type: "PING" }));
    client.emit("message", [bufferChunk] as unknown as Buffer[]);
    expect(parseLast(client)?.type).toBe("PONG");

    client.emit("message", 42 as unknown as Buffer);
    const errorPayload = parseLast(client);
    expect(errorPayload?.type).toBe("ERROR");
  });
});
