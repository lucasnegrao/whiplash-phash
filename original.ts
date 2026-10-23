import sharp, { type SharpInput, type SharpOptions } from "sharp";

const SAMPLE_SIZE = 32;
const LOW_SIZE = 8;
const SQRT = Array.from(
  { length: SAMPLE_SIZE },
  (_, i) => i === 0 ? 1 / Math.sqrt(2) : 1,
);
const COS = Array.from(
  { length: SAMPLE_SIZE },
  (_, k) =>
    Array.from(
      { length: SAMPLE_SIZE },
      (_, n) => Math.cos(((2 * k + 1) / (2 * SAMPLE_SIZE)) * n * Math.PI),
    ),
);

function applyDCT(f: number[][], size: number) {
  const result: number[][] = new Array(size);
  for (let u = 0; u < size; u++) {
    result[u] = new Array(size);
    for (let v = 0; v < size; v++) {
      let sum = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          sum += COS[i][u] * COS[j][v] * f[i][j];
        }
      }
      sum *= (SQRT[u] * SQRT[v]) / 4;
      result[u][v] = sum;
    }
  }
  return result;
}

export default async function original(
  image: SharpInput,
  options?: SharpOptions,
): Promise<string> {
  const data = await sharp(image, options)
    .greyscale()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .rotate()
    .raw()
    .toBuffer();

  const signal: number[][] = new Array(SAMPLE_SIZE);
  for (let x = 0; x < SAMPLE_SIZE; x++) {
    signal[x] = new Array(SAMPLE_SIZE);
    for (let y = 0; y < SAMPLE_SIZE; y++) {
      signal[x][y] = data[SAMPLE_SIZE * y + x];
    }
  }

  const dct = applyDCT(signal, SAMPLE_SIZE);
  let total = 0;
  for (let x = 0; x < LOW_SIZE; x++) {
    for (let y = 0; y < LOW_SIZE; y++) {
      total += dct[x + 1][y + 1];
    }
  }

  const average = total / (LOW_SIZE * LOW_SIZE);
  let fingerprint = "";
  for (let x = 0; x < LOW_SIZE; x++) {
    for (let y = 0; y < LOW_SIZE; y++) {
      fingerprint += dct[x + 1][y + 1] > average ? "1" : "0";
    }
  }
  return fingerprint;
}

export function originalDistance(a: string, b: string): number {
  let count = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) count++;
  }
  return count;
}
