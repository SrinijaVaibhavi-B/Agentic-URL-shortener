import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCustomSlug, validateDestination } from "./url-policy";

test("destination policy accepts public HTTP and HTTPS URLs", () => {
  assert.equal(validateDestination("https://example.com/path"), "https://example.com/path");
  assert.equal(validateDestination("http://example.com"), "http://example.com/");
});

test("destination policy rejects non-web schemes and embedded credentials", () => {
  assert.throws(() => validateDestination("javascript:alert(1)"), /HTTP or HTTPS/);
  assert.throws(
    () => validateDestination("https://user:pass@example.com"),
    /embedded credentials/,
  );
});

test("destination policy rejects loopback, link-local, and private networks", () => {
  for (const value of [
    "http://localhost",
    "http://service.local",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://172.16.1.1",
    "http://192.168.1.1",
    "http://169.254.169.254",
    "http://[::1]",
  ]) {
    assert.throws(() => validateDestination(value), /not allowed/);
  }
});

test("slug policy is deterministic and reserves application routes", () => {
  assert.equal(normalizeCustomSlug("release-2026"), "release-2026");
  assert.throws(() => normalizeCustomSlug("Release Notes"), /lowercase letters/);
  assert.throws(() => normalizeCustomSlug("api"), /reserved/);
});