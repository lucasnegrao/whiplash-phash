import sharp from "sharp";
import { jpeg } from "./fixtures.ts";
import { encodeThumbToWebp, phash } from "./mod.ts";

const bytes = new Uint8Array(await jpeg(720, 1440));
const group = "JPEG 720×1440 to WebP thumbnail";

function encodeOnly() {
  return sharp(bytes)
    .resize({ height: 1080, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toUint8Array();
}

Deno.bench({ name: "WebP only (no hash)", group }, async () => {
  await encodeOnly();
});

Deno.bench({ name: "thumbnail with phash:false", group }, async () => {
  await encodeThumbToWebp(bytes, { phash: false });
});

Deno.bench(
  { name: "WebP then source pHash", group, baseline: true },
  async () => {
    await encodeOnly();
    await phash(bytes);
  },
);

Deno.bench({ name: "combined WebP + source pHash", group }, async () => {
  await encodeThumbToWebp(bytes);
});
