/**
 * Shared-family trim from pics-original-restore → pics/ and public/pics/.
 *
 * Current behaviour:
 * 1) Before anything else, promote any full 1024×1024 drop left in pics/
 *    (or public/pics/) into pics-original-restore under the source name.
 *    This stops a later wipe+rebuild from destroying a newly replaced original.
 * 2) Originals are already transparent-canvas PNGs. Black ink is content.
 * 3) Content = any pixel with alpha above ALPHA_KEEP (colour is ignored).
 * 4) Crop to the union bbox of content across each animation family.
 * 5) Every pixel inside the crop is copied as-is — black text stays black,
 *    existing transparency stays transparent. No RGB wipe, no white fill.
 * 6) Aborts if any opaque pixel would fall outside the crop, or if black-ink
 *    counts change after extract.
 * 7) Only writes to pics-original-restore when promoting a dropped full original.
 *
 * Drop new art as 1024×1024 into pics/ using the URL-safe name
 * (e.g. ucinter-in.PNG, output2.PNG), then run: npm run trim
 *
 * Run: npm run trim
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('pics-original-restore');
const OUTS = [path.resolve('pics'), path.resolve('public/pics')];

/** Pixels with alpha above this count as content (including black ink). */
const ALPHA_KEEP = 8;
/** Extra margin around the shared content box so soft edges are not flush. */
const PAD = 16;

/** Source filenames (may contain +) → output filename (URL-safe). */
const NAME_OUT: Record<string, string> = {
  'view.PNG': 'view.PNG',
  'viewinput.PNG': 'viewinput.PNG',
  'viewoutend.PNG': 'viewoutend.PNG',
  'con1.PNG': 'con1.PNG',
  'con2.PNG': 'con2.PNG',
  'con3.PNG': 'con3.PNG',
  'inputb1.PNG': 'inputb1.PNG',
  'inputb2.PNG': 'inputb2.PNG',
  'inputb3.PNG': 'inputb3.PNG',
  'uc.PNG': 'uc.PNG',
  'ucinter+in.PNG': 'ucinter-in.PNG',
  'ucinter+out.PNG': 'ucinter-out.PNG',
  'da.PNG': 'da.PNG',
  'da+uccall.PNG': 'da-uccall.PNG',
  'da+ucinter.PNG': 'da-ucinter.PNG',
  'dainter.PNG': 'dainter.PNG',
  'da+dainter.PNG': 'da-dainter.PNG',
  'db.PNG': 'db.PNG',
  'da+db.PNG': 'da-db.PNG',
  'entity.PNG': 'entity.PNG',
  'entity1.PNG': 'entity1.PNG',
  'entity2.PNG': 'entity2.PNG',
  'output1.PNG': 'output1.PNG',
  'output2.PNG': 'output2.PNG',
  'output3.PNG': 'output3.PNG',
  'present.PNG': 'present.PNG',
  'present+call.PNG': 'present-call.PNG',
};

const OUT_TO_SRC: Record<string, string> = Object.fromEntries(
  Object.entries(NAME_OUT).map(([src, out]) => [out, src]),
);

const FAMILIES: Record<string, string[]> = {
  view: ['view.PNG', 'viewinput.PNG', 'viewoutend.PNG'],
  con: ['con1.PNG', 'con2.PNG', 'con3.PNG'],
  inputb: ['inputb1.PNG', 'inputb2.PNG', 'inputb3.PNG'],
  uc: ['uc.PNG', 'ucinter+in.PNG', 'ucinter+out.PNG'],
  da: ['da.PNG', 'da+uccall.PNG', 'da+ucinter.PNG'],
  dainter: ['dainter.PNG', 'da+dainter.PNG'],
  db: ['db.PNG', 'da+db.PNG'],
  entity: ['entity.PNG', 'entity1.PNG', 'entity2.PNG'],
  output: ['output1.PNG', 'output2.PNG', 'output3.PNG'],
  present: ['present.PNG', 'present+call.PNG'],
};

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PixelStats {
  opaque: number;
  opaqueBlack: number;
}

function isOpaque(a: number): boolean {
  return a > ALPHA_KEEP;
}

function isOpaqueBlack(r: number, g: number, b: number, a: number): boolean {
  return isOpaque(a) && r <= 8 && g <= 8 && b <= 8;
}

async function loadRaw(file: string | Buffer): Promise<{
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function scanOpaque(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
): { box: Box; stats: PixelStats } {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let opaque = 0;
  let opaqueBlack = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (!isOpaque(a)) continue;
      opaque++;
      if (isOpaqueBlack(r, g, b, a)) opaqueBlack++;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) {
    return {
      stats: { opaque: 0, opaqueBlack: 0 },
      box: { left: 0, top: 0, right: width - 1, bottom: height - 1 },
    };
  }
  return {
    stats: { opaque, opaqueBlack },
    box: { left, top, right, bottom },
  };
}

function union(a: Box, b: Box): Box {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

function expand(box: Box, w: number, h: number, amount: number): Box {
  return {
    left: Math.max(0, box.left - amount),
    top: Math.max(0, box.top - amount),
    right: Math.min(w - 1, box.right + amount),
    bottom: Math.min(h - 1, box.bottom + amount),
  };
}

function countOpaqueOutside(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  crop: Box,
): number {
  let lost = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      if (!isOpaque(data[i + 3]!)) continue;
      if (x < crop.left || x > crop.right || y < crop.top || y > crop.bottom) lost++;
    }
  }
  return lost;
}

async function main(): Promise<void> {
  if (!fs.existsSync(SRC)) throw new Error(`missing originals: ${SRC}`);

  // Promote any full-size drop in output folders into restore BEFORE wiping.
  // Dropping a new 1024 art into pics/ used to be deleted by the wipe below.
  const promoted: string[] = [];
  for (const dir of OUTS) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.toLowerCase().endsWith('.png')) continue;
      const srcName = OUT_TO_SRC[name];
      if (!srcName) continue;
      const dropPath = path.join(dir, name);
      const meta = await sharp(dropPath).metadata();
      if (meta.width !== 1024 || meta.height !== 1024) continue;
      const dest = path.join(SRC, srcName);
      fs.copyFileSync(dropPath, dest);
      promoted.push(`${name} → ${srcName}`);
      console.log(`promote drop: ${dropPath} → ${dest}`);
    }
  }
  if (promoted.length === 0) {
    console.log('promote drop: none (no new 1024×1024 files in pics/)');
  }

  for (const out of OUTS) {
    fs.mkdirSync(out, { recursive: true });
    for (const f of fs.readdirSync(out)) {
      if (f.toLowerCase().endsWith('.png')) fs.unlinkSync(path.join(out, f));
    }
  }

  for (const [family, files] of Object.entries(FAMILIES)) {
    const loaded = [];
    for (const name of files) {
      const full = path.join(SRC, name);
      if (!fs.existsSync(full)) throw new Error(`missing ${full}`);
      const raw = await loadRaw(full);
      if (raw.width !== 1024 || raw.height !== 1024) {
        throw new Error(`${name} is ${raw.width}x${raw.height}, expected 1024x1024`);
      }
      if (raw.data[3]! > ALPHA_KEEP) {
        throw new Error(`${name}: corner is not transparent (expected alpha canvas)`);
      }
      const scanned = scanOpaque(raw.data, raw.width, raw.height, raw.channels);
      loaded.push({
        name,
        full,
        width: raw.width,
        height: raw.height,
        channels: raw.channels,
        data: raw.data,
        stats: scanned.stats,
        box: scanned.box,
      });
      console.log(
        `  ${name}: opaque=${scanned.stats.opaque} blackInk=${scanned.stats.opaqueBlack} ` +
          `span=(${scanned.box.left},${scanned.box.top})-(${scanned.box.right},${scanned.box.bottom})`,
      );
    }

    const w = loaded[0]!.width;
    const h = loaded[0]!.height;
    let crop = loaded[0]!.box;
    for (let i = 1; i < loaded.length; i++) crop = union(crop, loaded[i]!.box);
    crop = expand(crop, w, h, PAD);
    const cw = crop.right - crop.left + 1;
    const ch = crop.bottom - crop.top + 1;
    console.log(`${family}: shared crop ${cw}x${ch} @ (${crop.left},${crop.top})`);

    for (const item of loaded) {
      const lost = countOpaqueOutside(
        item.data,
        item.width,
        item.height,
        item.channels,
        crop,
      );
      if (lost > 0) {
        throw new Error(`${item.name}: crop would drop ${lost} opaque pixels`);
      }

      const png = await sharp(item.full)
        .ensureAlpha()
        .extract({ left: crop.left, top: crop.top, width: cw, height: ch })
        .png()
        .toBuffer();

      const after = await loadRaw(png);
      const afterScan = scanOpaque(after.data, after.width, after.height, after.channels);
      if (afterScan.stats.opaque !== item.stats.opaque) {
        throw new Error(
          `${item.name}: opaque ${item.stats.opaque} → ${afterScan.stats.opaque}`,
        );
      }
      if (afterScan.stats.opaqueBlack !== item.stats.opaqueBlack) {
        throw new Error(
          `${item.name}: black ink ${item.stats.opaqueBlack} → ${afterScan.stats.opaqueBlack}`,
        );
      }
      if (after.data[3]! > ALPHA_KEEP) {
        throw new Error(`${item.name}: output corner lost transparency`);
      }

      const outName = NAME_OUT[item.name];
      if (!outName) throw new Error(`no out name for ${item.name}`);
      for (const out of OUTS) {
        fs.writeFileSync(path.join(out, outName), png);
      }
    }
  }

  console.log('trim ok — alpha crop only, black ink preserved, canvas stays transparent');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
