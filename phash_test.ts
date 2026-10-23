import { equal, match, notEqual, rejects } from "node:assert/strict";
import sharp, { type SharpInput, type SharpOptions } from "sharp";
import { jpeg, pixels } from "./fixtures.ts";
import { distance, phash } from "./mod.ts";
import original from "./original.ts";

const raw: SharpOptions = { raw: { width: 32, height: 32, channels: 1 } };

async function assertCompatible(image: SharpInput, options?: SharpOptions) {
  const expected = await original(image, options);
  const actual = await phash(image, options);
  match(actual, /^[01]{64}$/);
  equal(actual, expected);
  return actual;
}

Deno.test("matches the original on 32 deterministic raw images", async () => {
  for (let seed = 1; seed <= 32; seed++) {
    await assertCompatible(pixels(32, 32, 1, seed), raw);
  }
});

Deno.test("matches the original on flat and symmetric images", async () => {
  for (const value of [0, 1, 127, 255]) {
    const hash = await assertCompatible(new Uint8Array(1024).fill(value), raw);
    if (value === 0) equal(hash, "0".repeat(64));
  }

  for (
    const pattern of [
      (x: number, _y: number) => x * 8,
      (_x: number, y: number) => y * 8,
      (x: number, y: number) => (x + y) % 2 * 255,
      (x: number, y: number) => (x === 16 && y === 16 ? 255 : 0),
    ]
  ) {
    const data = Uint8Array.from(
      { length: 1024 },
      (_, i) => pattern(i % 32, Math.floor(i / 32)),
    );
    await assertCompatible(data, raw);
  }
});

Deno.test("matches the original on resized JPEG and alpha PNG inputs", async () => {
  await assertCompatible(await jpeg(137, 91));
  const png = await sharp(pixels(61, 97, 4), {
    raw: { width: 61, height: 97, channels: 4 },
  }).png().toBuffer();
  await assertCompatible(png);
});

Deno.test("matches the original with EXIF orientation", async () => {
  const image = await sharp(pixels(97, 61, 3), {
    raw: { width: 97, height: 61, channels: 3 },
  }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  await assertCompatible(image);
});

Deno.test("is deterministic and safe for concurrent calls", async () => {
  const image = await jpeg(64, 48);
  const expected = await phash(image);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => phash(image)),
  );
  for (const result of results) {
    equal(result, expected);
    equal(distance(result, expected), 0);
  }
  notEqual(
    await phash(pixels(32, 32, 1, 1), raw),
    await phash(
      pixels(32, 32, 1, 2),
      raw,
    ),
  );
});

Deno.test("rejects invalid input", async () => {
  await rejects(() => phash(new Uint8Array()));
  await rejects(() => phash(new Uint8Array([1, 2, 3])));
});
