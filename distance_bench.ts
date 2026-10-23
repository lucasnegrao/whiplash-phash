import distance from "./distance.ts";
import { pixels } from "./fixtures.ts";
import { originalDistance } from "./original.ts";
import phash from "./phash.ts";

const hashes: string[] = [];
for (let seed = 1; seed <= 32; seed++) {
  hashes.push(
    await phash(pixels(32, 32, 1, seed), {
      raw: { width: 32, height: 32, channels: 1 },
    }),
  );
}

const groups: Record<string, [string, string][]> = {
  identical: hashes.map((a) => [a, [...a].join("")]),
  similar: hashes.map((a, bit) => [
    a,
    a.slice(0, bit) + (a[bit] === "0" ? "1" : "0") + a.slice(bit + 1),
  ]),
  unrelated: hashes.map((a, i) => [a, hashes[(i + 1) % hashes.length]]),
};

for (const [group, pairs] of Object.entries(groups)) {
  const expected = pairs.reduce(
    (total, [a, b]) => total + originalDistance(a, b),
    0,
  );
  for (
    const [name, fn] of [
      ["original", originalDistance],
      ["optimized", distance],
    ] as const
  ) {
    Deno.bench({
      name: `${group} / ${name} (32 pairs)`,
      group,
      baseline: name === "original",
    }, () => {
      let total = 0;
      for (const [a, b] of pairs) total += fn(a, b);
      if (total !== expected) throw new Error("Incorrect distance total");
    });
  }
}
