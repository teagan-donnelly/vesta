import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import sharp from "sharp";

test("official Vesta lockup remains the supplied image with genuine transparency", async () => {
  const asset = readFileSync("public/brand/vesta-goddess.png");
  assert.equal(
    createHash("sha256").update(asset).digest("hex"),
    "0675eae91fa937f3e8c80b568ef8fd3afcf536b90532917618aa633fe9bcf84b",
  );
  const metadata = await sharp(asset).metadata();
  assert.equal(metadata.width, 1774);
  assert.equal(metadata.height, 887);
  assert.equal(metadata.hasAlpha, true);
  const { data } = await sharp(asset)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] === 0) transparent++;
  assert.ok(transparent > 1_000_000, "background must remain transparent");
});

test("Vesta browser and home-screen icons are valid image assets", async () => {
  const favicon = readFileSync("app/favicon.ico");
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 3);
  for (let i = 0; i < 3; i++) {
    const entry = 6 + 16 * i;
    const offset = favicon.readUInt32LE(entry + 12);
    const length = favicon.readUInt32LE(entry + 8);
    const metadata = await sharp(
      favicon.subarray(offset, offset + length),
    ).metadata();
    assert.equal(metadata.width, [32, 48, 64][i]);
    assert.equal(metadata.height, metadata.width);
  }
  for (const [file, size] of [
    ["app/icon.png", 512],
    ["app/apple-icon.png", 180],
  ] as const) {
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
  }
});
