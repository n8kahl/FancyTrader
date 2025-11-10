import axios from "axios";
import type { AxiosResponse } from "axios";
import { followNextUrls, encodeCursor, decodeCursor } from "../utils/polygonPage.js";

vi.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

type PageRecord = { n: number };

type MockResponse<T> = AxiosResponse<T>;

const makePage = (items: number[], next?: string | null) => ({
  results: items.map((n) => ({ n })),
  next_url: next ?? null,
});

const parsePage = (payload: unknown) => payload as { results: PageRecord[]; next_url?: string | null };
const mapItem = (record: PageRecord) => record.n;

const mockResponse = <T>(status: number, data: T, headers: Record<string, string> = {}): MockResponse<T> => ({
  status,
  statusText: String(status),
  data,
  headers,
  config: { headers: {} } as MockResponse<T>["config"],
  request: {},
});

describe("followNextUrls", () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
  });

  it("follows next_url across pages", async () => {
    mockedAxios.get
      .mockResolvedValueOnce(mockResponse(200, makePage([1, 2], "https://next/2")))
      .mockResolvedValueOnce(mockResponse(200, makePage([3, 4], null)));

    const result = await followNextUrls<number, PageRecord>(
      "https://start",
      {},
      parsePage,
      mapItem,
      { maxPages: 5 }
    );

    expect(result.items).toEqual([1, 2, 3, 4]);
  });

  it("retries after 429 then continues", async () => {
    mockedAxios.get
      .mockResolvedValueOnce(mockResponse(429, makePage([], "https://next"), { "retry-after": "0" }))
      .mockResolvedValueOnce(mockResponse(200, makePage([5], null)));

    const result = await followNextUrls<number, PageRecord>(
      "https://start",
      {},
      parsePage,
      mapItem,
      { maxPages: 3, sleepMs: 1 }
    );

    expect(result.items).toEqual([5]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });
});

describe("cursor helpers", () => {
  it("round-trips cursor encoding", () => {
    const url = "https://example.com/page/2?cursor=abc";
    const token = encodeCursor(url);
    expect(decodeCursor(token)).toBe(url);
  });
});
