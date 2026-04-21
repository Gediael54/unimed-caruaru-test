import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./http";

describe("http request helper", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the parsed payload for successful responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );

    await expect(request<{ ok: boolean }>("/health")).resolves.toEqual({ ok: true });
  });

  it("returns undefined for 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 }))
    );

    await expect(request<void>("/tasks/1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("uses the API problem detail when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ detail: "Validation failed." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          })
      )
    );

    await expect(request("/tasks")).rejects.toThrow("Validation failed.");
  });

  it("falls back to error and title fields when detail is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "Legacy error." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          })
      )
    );

    await expect(request("/tasks")).rejects.toThrow("Legacy error.");

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ title: "Only title." }), {
            status: 409,
            headers: { "Content-Type": "application/json" }
          })
      )
    );

    await expect(request("/tasks")).rejects.toThrow("Only title.");
  });

  it("falls back to the status code when the JSON body has no known error fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({}), {
            status: 422,
            headers: { "Content-Type": "application/json" }
          })
      )
    );

    await expect(request("/tasks")).rejects.toThrow("Request failed with status 422.");
  });

  it("falls back to the status code when the response body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("internal error", {
            status: 503,
            headers: { "Content-Type": "text/plain" }
          })
      )
    );

    await expect(request("/tasks")).rejects.toThrow("Request failed with status 503.");
  });
});
