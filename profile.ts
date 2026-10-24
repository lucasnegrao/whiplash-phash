/** The SAMPLE_SIZE of the source image sample used by the pHash profile. */
export const SAMPLE_SIZE = 32;
/** The LOW_SIZE of the low-frequency DCT region used in the pHash. */
export const LOW_SIZE = 8;

/** Describes the algorithm, dimensions, version, and bit length of this pHash profile. */
const PHASH_PROFILE = {
  algorithm: "whiplash-phash",
  profile: `source-dct-${SAMPLE_SIZE}x${SAMPLE_SIZE}-${LOW_SIZE}x${LOW_SIZE}`,
  version: 1,
  bits: LOW_SIZE * LOW_SIZE,
} as const;
export default PHASH_PROFILE;
