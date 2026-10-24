// deno-lint-ignore no-import-prefix -- Direct file imports do not inherit import maps.
import sharp, { type SharpInput, type SharpOptions } from "npm:sharp@0.35.5";
import { LOW_SIZE, SAMPLE_SIZE } from "./profile.ts";

const COS = new Float64Array(LOW_SIZE * SAMPLE_SIZE);

for (let frequency = 1; frequency <= LOW_SIZE; frequency++) {
  for (let position = 0; position < SAMPLE_SIZE; position++) {
    COS[(frequency - 1) * SAMPLE_SIZE + position] = Math.cos(
      ((2 * position + 1) / (2 * SAMPLE_SIZE)) * frequency * Math.PI,
    );
  }
}

export default async function phash(
  image: SharpInput,
  options?: SharpOptions,
): Promise<string> {
  const data = await sharp(image, options)
    .greyscale()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .rotate()
    .raw()
    .toBuffer();

  const coefficients = new Float64Array(LOW_SIZE * LOW_SIZE);
  let total = 0;

  for (let u = 0; u < LOW_SIZE; u++) {
    for (let v = 0; v < LOW_SIZE; v++) {
      let sum = 0;
      for (let x = 0; x < SAMPLE_SIZE; x++) {
        const cosX = COS[u * SAMPLE_SIZE + x];
        for (let y = 0; y < SAMPLE_SIZE; y++) {
          // Keep the original summation order: reassociation can flip hash bits.
          sum += cosX * COS[v * SAMPLE_SIZE + y] * data[y * SAMPLE_SIZE + x];
        }
      }
      const coefficient = sum / 4;
      coefficients[u * LOW_SIZE + v] = coefficient;
      total += coefficient;
    }
  }

  const average = total / coefficients.length;
  let fingerprint = "";
  for (const coefficient of coefficients) {
    fingerprint += coefficient > average ? "1" : "0";
  }
  return fingerprint;
}
