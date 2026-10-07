import { test } from "node:test";
import assert from "node:assert/strict";
import { lebaneseMobileNational, formatLebaneseMobile } from "../lib/phone.ts";

test("accepts Lebanese mobiles in any common spelling", () => {
  for (const [input, national] of [
    ["03 515 078", "3515078"], ["+961 3 515 078", "3515078"], ["00961 3515078", "3515078"],
    ["71 123 456", "71123456"], ["+96170111222", "70111222"], ["081-222-333", "81222333"], ["76555123", "76555123"],
  ]) assert.equal(lebaneseMobileNational(input), national, input);
});

test("rejects landlines, foreign and malformed numbers", () => {
  for (const input of ["01 234 567", "04 123 456", "+33 6 12 34 56 78", "03 51", "7012345", "72 123 456", "", "abc"]) {
    assert.equal(lebaneseMobileNational(input), null, input);
  }
});

test("formats for display", () => {
  assert.equal(formatLebaneseMobile("3515078"), "03 515 078");
  assert.equal(formatLebaneseMobile("71123456"), "71 123 456");
});
