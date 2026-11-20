/**
 * make.fun entry for news-image-20261120.
 *
 * Copies the finished poster that sits beside this module into the grader's
 * output directory, then re-reads the copy and checks the PNG limits.
 * Node 22, standard library only, no network access.
 */

import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1024;

async function main(): Promise<void> {
  // Resolve the poster relative to this module, never from a fixed path.
  const source = fileURLToPath(new URL('./entry.png', import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const target = join(outputDir, 'entry.png');

  await mkdir(outputDir, { recursive: true });
  await copyFile(source, target);

  // Validate the bytes actually written, not the source file.
  const written = await readFile(target);

  if (!written.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`${target} does not start with the 8-byte PNG signature`);
  }
  if (written.length < 24) {
    throw new Error(`${target} is only ${written.length} bytes, too small to hold a PNG header`);
  }
  if (written.length > MAX_BYTES) {
    throw new Error(`${target} is ${written.length} bytes, above the 1048576-byte limit`);
  }

  // The first chunk must be IHDR with a 13-byte payload, so bytes 16-23 really
  // are the width and height, both unsigned 32-bit big-endian values.
  if (written.readUInt32BE(8) !== 13 || written.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error(`${target} does not begin with a 13-byte IHDR chunk`);
  }
  const width = written.readUInt32BE(16);
  const height = written.readUInt32BE(20);
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(
      `${target} is ${width}x${height}, above the ${MAX_DIMENSION}x${MAX_DIMENSION} limit`,
    );
  }

  console.log(`Wrote ${written.length} bytes (${width}x${height}) to ${target}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to publish entry.png: ${message}`);
  process.exitCode = 1;
});
