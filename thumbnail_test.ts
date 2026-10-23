import { deepEqual, equal, match, ok, rejects } from "node:assert/strict";
import sharp from "sharp";
import { jpeg, pixels } from "./fixtures.ts";
import { encodeThumbToWebp, type ImageWebp, phash } from "./mod.ts";

Deno.test("thumbnail returns the original WebP encoding plus the source pHash", async () => {
  const bytes = new Uint8Array(await jpeg(137, 91));
  const result: ImageWebp = await encodeThumbToWebp(bytes);
  const { data } = await sharp(bytes)
    .resize({ height: 1080, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toUint8Array();
  const metadata = await sharp(result.bytes).metadata();

  ok(result.bytes instanceof Uint8Array);
  deepEqual(result.bytes, data);
  equal(result.contentType, "image/webp");
  equal(result.byteSize, result.bytes.byteLength);
  equal(metadata.format, "webp");
  equal(result.width, metadata.width);
  equal(result.height, metadata.height);
  equal(result.phash, await phash(bytes));
  ok(typeof result.phash === "string");
  match(result.phash, /^[01]{64}$/);
});

Deno.test("thumbnail honors custom height and quality without changing the source hash", async () => {
  const bytes = await jpeg(120, 160);
  const result = await encodeThumbToWebp(bytes, {
    maxHeight: 80,
    quality: 35,
    phash: true,
  });
  const expected = await sharp(bytes)
    .resize({ height: 80, withoutEnlargement: true })
    .webp({ quality: 35 })
    .toUint8Array();
  deepEqual(result.bytes, expected.data);
  equal(result.width, 60);
  equal(result.height, 80);
  equal(result.phash, await phash(bytes));
});

Deno.test("thumbnail omits the hash when disabled and leaves WebP bytes unchanged", async () => {
  const bytes = await jpeg(64, 48);
  const { phash: hash, ...expected } = await encodeThumbToWebp(bytes);
  ok(typeof hash === "string");
  const result = await encodeThumbToWebp(bytes, { phash: false });
  equal(Object.hasOwn(result, "phash"), false);
  deepEqual(result, expected);
});

Deno.test("thumbnail caps height, preserves aspect ratio, and never upscales", async () => {
  for (
    const [width, height, expectedWidth, expectedHeight] of [
      [64, 2160, 32, 1080],
      [2400, 120, 2400, 120],
      [48, 1080, 48, 1080],
      [1, 1, 1, 1],
    ]
  ) {
    const result = await encodeThumbToWebp(await jpeg(width, height));
    equal(result.width, expectedWidth);
    equal(result.height, expectedHeight);
    const metadata = await sharp(result.bytes).metadata();
    equal(metadata.width, expectedWidth);
    equal(metadata.height, expectedHeight);
  }
});

Deno.test("thumbnail preserves alpha", async () => {
  const bytes = await sharp(pixels(13, 19, 4), {
    raw: { width: 13, height: 19, channels: 4 },
  }).png().toBuffer();
  const result = await encodeThumbToWebp(bytes);
  equal((await sharp(result.bytes).metadata()).hasAlpha, true);
  equal(result.phash, await phash(bytes));
});

Deno.test("thumbnail preserves the original encoder's EXIF behavior", async () => {
  const bytes = await sharp(await jpeg(97, 61))
    .withMetadata({ orientation: 6 }).toBuffer();
  const result = await encodeThumbToWebp(bytes);
  equal(result.width, 97);
  equal(result.height, 61);
  equal((await sharp(result.bytes).metadata()).orientation, undefined);
  equal(result.phash, await phash(bytes));
});

Deno.test("thumbnail encodes only the first animation frame", async () => {
  const bytes = await sharp(pixels(16, 32, 3), {
    raw: { width: 16, height: 32, channels: 3, pageHeight: 16 },
  }).webp({ lossless: true, delay: [100, 100], loop: 0 }).toBuffer();
  equal((await sharp(bytes).metadata()).pages, 2);

  const result = await encodeThumbToWebp(bytes);
  const firstFrame = await sharp(bytes, { page: 0, pages: 1 })
    .webp({ quality: 80 }).toUint8Array();
  deepEqual(result.bytes, firstFrame.data);
  equal(result.width, 16);
  equal(result.height, 16);
  equal((await sharp(result.bytes).metadata()).pages ?? 1, 1);
  equal(result.phash, await phash(bytes));
});

Deno.test("thumbnail accepts Uint8Array views with nonzero offsets", async () => {
  const bytes = await jpeg(37, 23);
  const padded = new Uint8Array(bytes.byteLength + 32).fill(255);
  padded.set(bytes, 16);
  const view = padded.subarray(16, 16 + bytes.byteLength);
  deepEqual(await encodeThumbToWebp(view), await encodeThumbToWebp(bytes));
});

Deno.test("thumbnail wraps invalid image errors with their cause", async () => {
  for (const bytes of [new Uint8Array(), new Uint8Array([1, 2, 3])]) {
    await rejects(() => encodeThumbToWebp(bytes), (error) => {
      ok(error instanceof Error);
      equal(
        error.message,
        "Thumbnail encoding failed. Check the source image, then retry.",
      );
      ok(error.cause instanceof Error);
      return true;
    });
  }
});

Deno.test("thumbnail rejects invalid encoding options", async () => {
  const bytes = await jpeg(16, 16);
  for (
    const options of [{ maxHeight: 0 }, { maxHeight: 1.5 }, { quality: 101 }]
  ) {
    await rejects(() => encodeThumbToWebp(bytes, options), (error) => {
      ok(error instanceof Error);
      ok(error.cause instanceof Error);
      return true;
    });
    deepEqual(sharp.counters(), { queue: 0, process: 0 });
  }
});

Deno.test("thumbnail rejects a pre-aborted signal with its original reason", async () => {
  const reason = new Error("Cancelled before processing");
  await rejects(
    () =>
      encodeThumbToWebp(new Uint8Array(), {
        signal: AbortSignal.abort(reason),
      }),
    (error) => error === reason,
  );
});

Deno.test("thumbnail cancellation waits for native work with hashing on or off", async () => {
  const bytes = await jpeg(720, 1440);
  for (const includePhash of [true, false]) {
    const controller = new AbortController();
    const reason = new Error("Cancelled during processing");
    const pending = encodeThumbToWebp(bytes, {
      signal: controller.signal,
      phash: includePhash,
    });
    controller.abort(reason);
    await rejects(() => pending, (error) => error === reason);
    deepEqual(sharp.counters(), { queue: 0, process: 0 });
  }
});

Deno.test("thumbnail cancellation takes precedence over an encoding failure", async () => {
  const controller = new AbortController();
  const reason = new Error("Cancelled invalid input");
  const pending = encodeThumbToWebp(new Uint8Array([1, 2, 3]), {
    signal: controller.signal,
  });
  controller.abort(reason);
  await rejects(() => pending, (error) => error === reason);
  deepEqual(sharp.counters(), { queue: 0, process: 0 });
});
