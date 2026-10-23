import { equal } from "node:assert/strict";
import distance from "./distance.ts";
import { pixels } from "./fixtures.ts";
import { originalDistance } from "./original.ts";

Deno.test("distance is zero for identical hashes and 64 for opposite hashes", () => {
  const zeros = "0".repeat(64);
  const ones = "1".repeat(64);
  equal(distance(zeros, zeros), 0);
  equal(distance(ones, ones), 0);
  equal(distance(zeros, ones), 64);
  equal(distance("01".repeat(32), "10".repeat(32)), 64);
});

Deno.test("distance counts a difference at every bit position", () => {
  const zeros = "0".repeat(64);
  for (let bit = 0; bit < 64; bit++) {
    const oneBit = "0".repeat(bit) + "1" + "0".repeat(63 - bit);
    equal(distance(zeros, oneBit), 1);
    equal(distance(oneBit, zeros), 1);
  }
});

Deno.test("distance matches the original on 1024 deterministic hash pairs", () => {
  const hashes = Array.from(
    { length: 32 },
    (_, seed) =>
      Array.from(pixels(64, 1, 1, seed), (value) => value & 1).join(""),
  );
  for (const a of hashes) {
    for (const b of hashes) {
      equal(distance(a, b), originalDistance(a, b));
      equal(distance(a, b), distance(b, a));
    }
  }
});

Deno.test("distance preserves the original behavior for other string lengths", () => {
  for (
    const [a, b, expected] of [
      ["", "", 0],
      ["", "1", 0],
      ["1", "", 1],
      ["10", "101", 0],
      ["101", "10", 1],
      ["abc", "adc", 1],
      ["\u00e9", "e", 1],
      ["\ud835\udc00", "\ud835\udc01", 1],
      ["0".repeat(128), "1".repeat(128), 128],
    ] as const
  ) {
    equal(distance(a, b), expected);
    equal(distance(a, b), originalDistance(a, b));
  }
});
