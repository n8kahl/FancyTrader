import {afterEach, describe, expect, it} from "vitest";
import { WebSocketServer } from "ws";
import { MassiveStreamingService } from "../src/services/massiveStreamingService";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const servers: WebSocketServer[] = [];

afterEach(async () => {
  const closures = servers.map(
    (server) =>
      new Promise<void>((resolve) => {
        server.clients.forEach((client) => {
          try {
            client.terminate();
          } catch {
            /* ignore */
          }
        });
        server.close(() => resolve());
      })
  );

  await Promise.allSettled(closures);
  servers.length = 0;
});

describe("MassiveStreamingService", () => {
  it("reconnects and resubscribes when the socket closes", async () => {
    const port = 18080 + Math.floor(Math.random() * 500);
    const wss = new WebSocketServer({ port });
    servers.push(wss);

    let connections = 0;
    wss.on("connection", (socket) => {
      connections += 1;
      socket.on("message", (message) => {
        const data = JSON.parse(String(message));
        if (data.action === "ping") {
          socket.send(JSON.stringify({ action: "pong" }));
        }
        if (data.action === "subscribe") {
          socket.send(JSON.stringify({ type: "subscribed", params: data.params }));
          setTimeout(() => socket.close(), 50);
        }
      });
    });

    const svc = new MassiveStreamingService({
      baseUrl: `ws://localhost:${port}`,
      apiKey: "test",
      subscriptions: ["T.AAPL"],
      logger: vi.fn(),
    });
    svc.on("error", () => undefined);
    svc.start();

    await wait(900);
    expect(connections).toBeGreaterThan(1);

    svc.stop();
    await wait(50);
  });

  it("updates subscriptions in-flight", async () => {
    const port = 19080 + Math.floor(Math.random() * 500);
    const wss = new WebSocketServer({ port });
    servers.push(wss);

    const received: string[] = [];
    wss.on("connection", (socket) => {
      socket.on("message", (message) => {
        received.push(message.toString());
        const data = JSON.parse(String(message));
        if (data.action === "ping") {
          socket.send(JSON.stringify({ action: "pong" }));
        }
      });
    });

    const svc = new MassiveStreamingService({
      baseUrl: `ws://localhost:${port}`,
      apiKey: "demo",
      logger: vi.fn(),
    });
    svc.on("error", () => undefined);

    svc.start();
    await wait(100);

    svc.subscribe("T.AAPL");
    await wait(50);
    svc.unsubscribe("T.AAPL");
    await wait(50);

    expect(received.some((msg) => msg.includes('"action":"subscribe"') && msg.includes("T.AAPL"))).toBe(true);
    expect(
      received.some((msg) => msg.includes('"action":"unsubscribe"') && msg.includes("T.AAPL"))
    ).toBe(true);

    svc.stop();
    await wait(50);
  });
});
