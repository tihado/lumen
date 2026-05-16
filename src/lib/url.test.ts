import { describe, expect, it } from "vitest";
import { isSafeHttpsUrl } from "@/lib/url";

describe("isSafeHttpsUrl", () => {
  it("accepts https public URLs", () => {
    expect(isSafeHttpsUrl("https://example.com/path")).toBe(true);
  });
  it("rejects non-https", () => {
    expect(isSafeHttpsUrl("http://example.com")).toBe(false);
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe(false);
  });
  it("rejects localhost", () => {
    expect(isSafeHttpsUrl("https://localhost/foo")).toBe(false);
  });
});
