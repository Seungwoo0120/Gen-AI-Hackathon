import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./client";

describe("api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("calls the backend and returns typed data", async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.url).toBe("http://localhost:8000/health");
      return Response.json({ status: "ok" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { data, error } = await api.GET("/health", { fetch: fetchMock });

    expect(error).toBeUndefined();
    expect(data?.status).toBe("ok");
  });
});
