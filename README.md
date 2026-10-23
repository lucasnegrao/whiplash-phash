# whiplash-phash

Perceptual image hashing for Deno. Turn an image into a 64-character bit string
(`"0"`/`"1"`), then compare two hashes to see how visually similar the images
are. Also includes a helper that makes a WebP thumbnail and its hash in one
call.

Built on [sharp](https://sharp.pixelplumbing.com/) for image decoding.

## Requirements

- [Deno](https://deno.com/)

## Package

|              |                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- |
| Name         | `whiplash-phash`                                                                             |
| Entry point  | [mod.ts](mod.ts)                                                                             |
| Exports      | `phash`, `distance`, `encodeThumbToWebp` (plus the `ImageWebp` and `ThumbnailOptions` types) |
| Dependencies | [sharp](https://sharp.pixelplumbing.com/) `0.35.5` (installed automatically by Deno)         |

To use it from another Deno project, map the name in that project's `deno.json`
to where you keep this module:

```json
{
  "imports": {
    "whiplash-phash": "../whiplash-phash/mod.ts"
  }
}
```

Then import it by name:

```ts
import { distance, encodeThumbToWebp, phash } from "whiplash-phash";
```

Inside this repo, import from `./mod.ts` instead.

## Sample usage

Find out whether two images look alike, and make a thumbnail for one of them:

```ts
import { distance, encodeThumbToWebp, phash } from "whiplash-phash";

const [hashA, hashB] = await Promise.all([
  phash("a.jpg"),
  phash("b.jpg"),
]);

const bits = distance(hashA, hashB);
console.log(bits <= 10 ? "Probably the same image" : "Different images", bits);

const thumb = await encodeThumbToWebp(await Deno.readFile("a.jpg"), {
  maxHeight: 480,
});
await Deno.writeFile("a-thumb.webp", thumb.bytes);
console.log(`${thumb.width}x${thumb.height}, ${thumb.byteSize} bytes`);
console.log("phash:", thumb.phash);
```

Run it with the permissions sharp needs:

```sh
deno run --allow-read --allow-write --allow-env --allow-ffi --allow-sys example.ts
```

## API

### `phash(image, options?)`

Returns a 64-character string of `0`/`1` for the image. `image` can be anything
sharp accepts (a `Uint8Array`/`Buffer`, a file path, etc.). `options` are passed
through to sharp.

```ts
const hash = await phash("photo.jpg");
// "1011001010..." (64 characters)
```

### `distance(a, b)`

Returns the number of differing bits between two hashes (the Hamming distance).
`0` means identical hashes; larger means less similar.

```ts
const a = await phash("photo.jpg");
const b = await phash("photo-resized.jpg");

distance(a, b); // e.g. 2 -> very similar
```

Both hashes must be the same length, which is always true for hashes from
`phash`. A distance of roughly 10 or less out of 64 usually means "probably the
same image", but tune this threshold for your data.

### `encodeThumbToWebp(bytes, options?)`

Creates a WebP thumbnail from image bytes and (by default) computes its
perceptual hash at the same time.

```ts
const bytes = await Deno.readFile("photo.jpg");
const thumb = await encodeThumbToWebp(bytes, { maxHeight: 480, quality: 75 });

thumb.bytes; // Uint8Array of the WebP image
thumb.contentType; // "image/webp"
thumb.byteSize; // size in bytes
thumb.width; // thumbnail width
thumb.height; // thumbnail height
thumb.phash; // 64-character hash (omitted if phash: false)
```

| Option      | Default | Description                                                |
| ----------- | ------- | ---------------------------------------------------------- |
| `maxHeight` | `1080`  | Maximum thumbnail height. Smaller images are not enlarged. |
| `quality`   | `80`    | WebP quality.                                              |
| `phash`     | `true`  | Set to `false` to skip hashing.                            |
| `signal`    | -       | An `AbortSignal` to cancel the operation.                  |

On failure it throws an `Error` with the original error as `cause`. If the
`signal` is aborted, the abort reason is thrown instead.

The hash is computed from the original image, not the thumbnail.

## Development

```sh
deno task test    # run tests
deno task bench   # run benchmarks
deno task check   # format check, lint, and type check
```

sharp uses native bindings, so scripts that import this module need these
permission flags:

```sh
deno run --allow-read --allow-env --allow-ffi --allow-sys your_script.ts
```

The tasks above already include them.
