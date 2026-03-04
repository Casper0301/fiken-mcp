import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FikenClient, FikenApiError } from "../client.js";

function mockFetch(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  });
}

describe("FikenClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("get()", () => {
    it("sends Authorization header with Bearer token", async () => {
      const fetchMock = mockFetch({ name: "Test User" });
      vi.stubGlobal("fetch", fetchMock);

      const client = new FikenClient("my-token");
      await client.get("/user");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://api.fiken.no/api/v2/user");
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer my-token"
      );
    });

    it("returns parsed JSON body", async () => {
      vi.stubGlobal("fetch", mockFetch({ id: 1, name: "Acme AS" }));
      const client = new FikenClient("token");
      const result = await client.get("/companies/acme");
      expect(result).toEqual({ id: 1, name: "Acme AS" });
    });

    it("appends query params, skipping undefined values", async () => {
      const fetchMock = mockFetch([]);
      vi.stubGlobal("fetch", fetchMock);

      const client = new FikenClient("token");
      await client.get("/companies/acme/invoices", {
        settled: true,
        customerId: undefined,
        page: 0,
      });

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("settled")).toBe("true");
      expect(parsed.searchParams.get("page")).toBe("0");
      expect(parsed.searchParams.has("customerId")).toBe(false);
    });

    it("throws FikenApiError on non-OK response", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetch({ message: "Unauthorized" }, 401)
      );

      const client = new FikenClient("bad-token");
      await expect(client.get("/user")).rejects.toThrow(FikenApiError);
      await expect(client.get("/user")).rejects.toMatchObject({
        status: 401,
        statusText: "Error",
      });
    });

    it("FikenApiError has correct name and message", async () => {
      vi.stubGlobal("fetch", mockFetch("Not Found", 404));

      const client = new FikenClient("token");
      try {
        await client.get("/companies/missing");
      } catch (e) {
        expect(e).toBeInstanceOf(FikenApiError);
        expect((e as FikenApiError).name).toBe("FikenApiError");
        expect((e as FikenApiError).status).toBe(404);
        expect((e as FikenApiError).message).toContain("404");
      }
    });
  });

  describe("getPaginated()", () => {
    it("returns data and pagination from response headers", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetch([{ id: 1 }, { id: 2 }], 200, {
          "Fiken-Api-Page": "0",
          "Fiken-Api-Page-Count": "5",
          "Fiken-Api-Result-Count": "42",
        })
      );

      const client = new FikenClient("token");
      const result = await client.getPaginated("/companies/acme/invoices", {
        page: 0,
        pageSize: 10,
      });

      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.pagination).toEqual({
        page: 0,
        pageCount: 5,
        resultCount: 42,
        pageSize: 10,
      });
    });

    it("falls back to data.length when result-count header is missing", async () => {
      vi.stubGlobal(
        "fetch",
        mockFetch([{ id: 1 }, { id: 2 }, { id: 3 }], 200, {
          "Fiken-Api-Page": "0",
          "Fiken-Api-Page-Count": "1",
        })
      );

      const client = new FikenClient("token");
      const result = await client.getPaginated("/companies/acme/products", {});
      expect(result.pagination.resultCount).toBe(3);
    });

    it("uses default page=0 and pageSize=25 when not specified", async () => {
      const fetchMock = mockFetch([], 200, {
        "Fiken-Api-Page": "0",
        "Fiken-Api-Page-Count": "1",
        "Fiken-Api-Result-Count": "0",
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new FikenClient("token");
      await client.getPaginated("/companies/acme/contacts", {});

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("page")).toBe("0");
      expect(parsed.searchParams.get("pageSize")).toBe("25");
    });

    it("passes extra filter params in query string", async () => {
      const fetchMock = mockFetch([], 200, {
        "Fiken-Api-Page": "0",
        "Fiken-Api-Page-Count": "1",
        "Fiken-Api-Result-Count": "0",
      });
      vi.stubGlobal("fetch", fetchMock);

      const client = new FikenClient("token");
      await client.getPaginated(
        "/companies/acme/contacts",
        { page: 1, pageSize: 50 },
        { supplier: true, name: "Acme" }
      );

      const [url] = fetchMock.mock.calls[0] as [string];
      const parsed = new URL(url);
      expect(parsed.searchParams.get("supplier")).toBe("true");
      expect(parsed.searchParams.get("name")).toBe("Acme");
      expect(parsed.searchParams.get("page")).toBe("1");
      expect(parsed.searchParams.get("pageSize")).toBe("50");
    });
  });

  describe("serial queue", () => {
    it("executes requests sequentially (no concurrent requests)", async () => {
      const order: number[] = [];
      let callCount = 0;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockImplementation(async () => {
          const n = ++callCount;
          order.push(n);
          return {
            ok: true,
            json: async () => ({ call: n }),
            headers: { get: () => null },
          };
        })
      );

      const client = new FikenClient("token");
      await Promise.all([
        client.get("/a"),
        client.get("/b"),
        client.get("/c"),
      ]);

      expect(order).toEqual([1, 2, 3]);
    });
  });
});
