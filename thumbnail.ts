// deno-lint-ignore no-import-prefix -- Direct file imports do not inherit import maps.
import sharp from "npm:sharp@0.35.5";
import phash from "./phash.ts";

export interface ImageWebp {
  bytes: Uint8Array;
  contentType: "image/webp";
  byteSize: number;
  width: number;
  height: number;
  phash?: string;
}

export interface ThumbnailOptions {
  maxHeight?: number;
  quality?: number;
  phash?: boolean;
  signal?: AbortSignal;
}

export async function encodeThumbToWebp(
  bytes: Uint8Array,
  { maxHeight = 1080, quality = 80, phash: includePhash = true, signal }:
    ThumbnailOptions = {},
): Promise<ImageWebp> {
  signal?.throwIfAborted();

  try {
    // Cancellation must wait for both native pipelines, including on failure.
    const [encoded, hash] = await Promise.allSettled([
      Promise.resolve().then(() =>
        sharp(bytes)
          .resize({ height: maxHeight, withoutEnlargement: true })
          .webp({ quality })
          .toUint8Array()
      ),
      includePhash ? phash(bytes) : undefined,
    ]);
    signal?.throwIfAborted();
    if (encoded.status === "rejected") throw encoded.reason;
    if (hash.status === "rejected") throw hash.reason;

    const { data, info } = encoded.value;
    return {
      bytes: data,
      contentType: "image/webp",
      byteSize: data.byteLength,
      width: info.width,
      height: info.height,
      ...(hash.value === undefined ? {} : { phash: hash.value }),
    };
  } catch (error) {
    signal?.throwIfAborted();
    throw new Error(
      "Thumbnail encoding failed. Check the source image, then retry.",
      {
        cause: error,
      },
    );
  }
}
