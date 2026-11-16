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

import { countInRange, splitHash } from "./pwned-range.ts";

test("pwned range parsing", () => {
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const { prefix, suffix } = splitHash("5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
  assert.equal(prefix, "5BAA6");
  assert.equal(suffix, "1E4C9B93F3F0682250B6CF8331B7EE68FD8");
  const body = `0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${suffix}:10434004\r\nFFFF0000000000000000000000000000000:0`;
  assert.equal(countInRange(body, suffix), 10434004);
  assert.equal(countInRange(body, "0018A45C4D1DEF81644B54AB7F969B88D65"), 1);
  assert.equal(countInRange(body, "NOTPRESENT"), 0);
  // padding entries (count 0) are not hits
  assert.equal(countInRange(body, "FFFF0000000000000000000000000000000"), 0);
});

import { PLATFORM_TARGETS } from "../constants/platforms.ts";
import { matchesTarget, normalizeSite, rankForTarget } from "./autofill-match.ts";

test("autofill matching", () => {
  const T = PLATFORM_TARGETS;
  const ig = { platform: "Instagram" };
  assert.equal(normalizeSite("https://www.Instagram.com/login?x=1"), "instagram.com");
  // browser page, exact + subdomain
  assert.ok(matchesTarget(ig, { packageName: "com.android.chrome", webDomain: "instagram.com" }, T));
  assert.ok(matchesTarget(ig, { packageName: "com.android.chrome", webDomain: "www.instagram.com" }, T));
  // native app by package
  assert.ok(matchesTarget(ig, { packageName: "com.instagram.android", webDomain: null }, T));
  // lookalike / other site must NOT match
  assert.ok(!matchesTarget(ig, { packageName: "com.android.chrome", webDomain: "instagram.com.evil.io" }, T));
  assert.ok(!matchesTarget(ig, { packageName: "com.android.chrome", webDomain: "notinstagram.com" }, T));
  assert.ok(!matchesTarget(ig, { packageName: "com.facebook.orca", webDomain: null }, T));
  // Facebook entry covers Messenger
  assert.ok(matchesTarget({ platform: "Facebook" }, { packageName: "com.facebook.orca", webDomain: null }, T));
  // custom website / package on the entry itself
  const custom = { platform: "MyBank", website: "https://bank.example.org/login" };
  assert.ok(matchesTarget(custom, { packageName: null, webDomain: "secure.bank.example.org" }, T));
  const app = { platform: "Corp", website: "com.corp.app" };
  assert.ok(matchesTarget(app, { packageName: "com.corp.app", webDomain: null }, T));
  // ranking
  const r = rankForTarget([{ platform: "Netflix" }, ig], { packageName: null, webDomain: "instagram.com" }, T);
  assert.deepEqual(r.matches, [ig]);
  assert.equal(r.others.length, 1);
});

import { findExistingEntry, guessPlatformName } from "./autofill-match.ts";

test("save-login helpers", () => {
  const T = PLATFORM_TARGETS;
  const t = (webDomain: string | null, packageName: string | null = null) => ({ webDomain, packageName });
  assert.equal(guessPlatformName(t("m.facebook.com"), T), "Facebook");
  assert.equal(guessPlatformName(t(null, "com.instagram.android"), T), "Instagram");
  assert.equal(guessPlatformName(t("login.shop.example.com"), T), "Example");
  assert.equal(guessPlatformName(t("www.mybank.co.uk"), T), "Mybank");
  assert.equal(guessPlatformName(t(null, "com.corp.app"), T), "Corp");
  assert.equal(guessPlatformName(t(null, null), T), "");

  const entries = [
    { platform: "Facebook", username: "Zahin", password: "a" },
    { platform: "Facebook", email: "z@x.com", password: "b" },
    { platform: "Netflix", username: "zahin", password: "c" },
  ];
  const fb = t("m.facebook.com");
  assert.equal(findExistingEntry(entries, fb, "zahin", T)?.password, "a"); // case-insensitive username
  assert.equal(findExistingEntry(entries, fb, "z@x.com", T)?.password, "b"); // email
  assert.equal(findExistingEntry(entries, fb, "nobody", T), undefined);
  assert.equal(findExistingEntry(entries, fb, "", T), undefined); // blank never matches a blank
});

test("search also matches a saved website", () => {
  const e = [{ platform: "MyBank", website: "secure.bank.example.org" }, { platform: "Other" }];
  assert.equal(filterEntries(e, "bank.example", null, DEFAULT_PLATFORMS).length, 1);
});

import { classifyIdentifier, pickIdentifier } from "./autofill-match.ts";

test("phone as a login identifier", () => {
  assert.equal(classifyIdentifier("a@b.com"), "email");
  assert.equal(classifyIdentifier("+1 (555) 010-9999"), "phone");
  assert.equal(classifyIdentifier("01712345678"), "phone");
  assert.equal(classifyIdentifier("zahin123"), "username");
  assert.equal(classifyIdentifier("12345"), "username"); // too short to be a phone

  const e = { username: "zahin", email: "z@x.com", phone: "+8801712345678" };
  assert.equal(pickIdentifier(e, "phone"), "+8801712345678");
  assert.equal(pickIdentifier(e, "email"), "z@x.com");
  assert.equal(pickIdentifier(e, "username"), "zahin");
  assert.equal(pickIdentifier(e, "any"), "zahin");
  assert.equal(pickIdentifier({ phone: "555" }, "email"), "555"); // falls back, never empty
  assert.equal(pickIdentifier({}, "phone"), "");

  // existing-account detection ignores phone formatting
  const T = PLATFORM_TARGETS;
  const entries = [{ platform: "Facebook", phone: "+880 1712-345678", password: "p" }];
  const fb = { webDomain: "m.facebook.com", packageName: null };
  assert.ok(findExistingEntry(entries, fb, "+8801712345678", T));
  assert.equal(findExistingEntry(entries, fb, "+8801799999999", T), undefined);

  // search finds a login by its phone number
  const a = { id: "1", platform: "X", password: "p", phone: "+88017" };
  assert.equal(filterEntries([a], "8801", null, DEFAULT_PLATFORMS).length, 1);
});
