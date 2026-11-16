import assert from "node:assert/strict";
import { randomFillSync } from "node:crypto";
import { test } from "node:test";
import { DEFAULT_PLATFORMS } from "../constants/platforms.ts";
import {
  GENERATOR_CHARS,
  generatePassword,
  passwordStrength,
} from "./password.ts";
import {
  filterEntries,
  groupByCategory,
  recentPlatforms,
  usedCategories,
} from "./vault-filter.ts";

test("passwordStrength", () => {
  assert.equal(passwordStrength(""), 0);
  assert.equal(passwordStrength("abc"), 1); // non-empty is at least 1
  assert.equal(passwordStrength("abcdefgh"), 1);
  assert.equal(passwordStrength("abcdefghijkl"), 2);
  assert.equal(passwordStrength("abcdefghijKL"), 3);
  assert.equal(passwordStrength("abcdefghiJK1!"), 4);
});

test("generatePassword", () => {
  const rnd = (n: number) => randomFillSync(new Uint8Array(n));
  const pw = generatePassword(rnd);
  assert.equal(pw.length, 16);
  assert.ok([...pw].every((c) => GENERATOR_CHARS.includes(c)));
  assert.ok(!/[0OIl1]/.test(GENERATOR_CHARS));
});

const entries = [
  { platform: "Google", username: "Ann", email: "ann@x.com" },
  { platform: "Netflix", username: "bob" },
  { platform: "Mystery", email: "z@z.com" }, // unmanaged -> Other
];

test("filterEntries", () => {
  const p = DEFAULT_PLATFORMS;
  assert.equal(filterEntries(entries, "", null, p).length, 3);
  assert.equal(filterEntries(entries, "ANN", null, p).length, 1); // username, case-insensitive
  assert.equal(filterEntries(entries, "netf", null, p)[0].platform, "Netflix");
  assert.equal(filterEntries(entries, "", "Other", p)[0].platform, "Mystery");
  assert.equal(filterEntries(entries, "bob", "Work", p).length, 0);
});

test("usedCategories", () => {
  assert.deepEqual(usedCategories(entries, DEFAULT_PLATFORMS), [
    "Work",
    "Entertainment",
    "Other",
  ]);
});

test("recentPlatforms", () => {
  const p = DEFAULT_PLATFORMS.map((x, i) => ({ ...x, lastUsedAt: i < 7 ? i + 1 : undefined }));
  const r = recentPlatforms(p);
  assert.equal(r.length, 5);
  assert.equal(r[0].name, p[6].name); // newest first
});

test("groupByCategory", () => {
  const g = groupByCategory(DEFAULT_PLATFORMS);
  assert.equal(g[0].title, "Social");
  assert.equal(g.reduce((n, x) => n + x.data.length, 0), DEFAULT_PLATFORMS.length);
});
