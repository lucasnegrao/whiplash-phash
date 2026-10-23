import sharp from "sharp";

export function pixels(width = 32, height = 32, channels = 1, seed = 1) {
  const data = new Uint8Array(width * height * channels);
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[i] = seed >>> 24;
  }
  return data;
}

export function jpeg(width = 1024, height = 768) {
  return sharp(pixels(width, height, 3), {
    raw: { width, height, channels: 3 },
  }).jpeg().toBuffer();
}
