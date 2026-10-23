import { jpeg, pixels } from "./fixtures.ts";
import original from "./original.ts";
import phash from "./phash.ts";

const rawImage = pixels();
const rawOptions = { raw: { width: 32, height: 32, channels: 1 as const } };
const encodedImage = await jpeg();

Deno.bench(
  { name: "original / raw 32×32", group: "raw", baseline: true },
  async () => {
    await original(rawImage, rawOptions);
  },
);

Deno.bench({ name: "optimized / raw 32×32", group: "raw" }, async () => {
  await phash(rawImage, rawOptions);
});

Deno.bench(
  { name: "original / JPEG 1024×768", group: "jpeg", baseline: true },
  async () => {
    await original(encodedImage);
  },
);

Deno.bench({ name: "optimized / JPEG 1024×768", group: "jpeg" }, async () => {
  await phash(encodedImage);
});
