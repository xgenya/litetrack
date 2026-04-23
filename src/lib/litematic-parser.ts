import pako from "pako";

interface NBTCompound {
  [key: string]: NBTValue;
}

type NBTValue =
  | number
  | bigint
  | string
  | number[]
  | bigint[]
  | NBTCompound
  | NBTCompound[]
  | NBTValue[];

interface ParsedMaterial {
  blockId: string;
  count: number;
}

class NBTReader {
  private data: DataView;
  private offset: number;
  private decoder = new TextDecoder("utf-8");

  constructor(buffer: ArrayBuffer) {
    this.data = new DataView(buffer);
    this.offset = 0;
  }

  readByte(): number {
    return this.data.getInt8(this.offset++);
  }

  readShort(): number {
    const value = this.data.getInt16(this.offset, false);
    this.offset += 2;
    return value;
  }

  readInt(): number {
    const value = this.data.getInt32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readLong(): bigint {
    const value = this.data.getBigInt64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readFloat(): number {
    const value = this.data.getFloat32(this.offset, false);
    this.offset += 4;
    return value;
  }

  readDouble(): number {
    const value = this.data.getFloat64(this.offset, false);
    this.offset += 8;
    return value;
  }

  readString(): string {
    const length = this.readShort();
    const bytes = new Uint8Array(this.data.buffer, this.offset, length);
    this.offset += length;
    return this.decoder.decode(bytes);
  }

  readByteArray(): number[] {
    const length = this.readInt();
    const start = this.offset;
    this.offset += length;
    return Array.from(new Int8Array(this.data.buffer, start, length));
  }

  readIntArray(): number[] {
    const length = this.readInt();
    const arr = new Int32Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = this.data.getInt32(this.offset, false);
      this.offset += 4;
    }
    return Array.from(arr);
  }

  readLongArray(): bigint[] {
    const length = this.readInt();
    // Return a view-backed typed array for zero-copy reads
    const arr: bigint[] = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = this.data.getBigInt64(this.offset, false);
      this.offset += 8;
    }
    return arr;
  }

  readTag(tagType: number): NBTValue {
    switch (tagType) {
      case 1: return this.readByte();
      case 2: return this.readShort();
      case 3: return this.readInt();
      case 4: return this.readLong();
      case 5: return this.readFloat();
      case 6: return this.readDouble();
      case 7: return this.readByteArray();
      case 8: return this.readString();
      case 9: return this.readList();
      case 10: return this.readCompound();
      case 11: return this.readIntArray();
      case 12: return this.readLongArray();
      default: throw new Error(`Unknown tag type: ${tagType}`);
    }
  }

  readList(): NBTValue[] {
    const itemType = this.readByte();
    const length = this.readInt();
    const list: NBTValue[] = new Array(length);
    for (let i = 0; i < length; i++) {
      list[i] = this.readTag(itemType);
    }
    return list;
  }

  readCompound(): NBTCompound {
    const compound: NBTCompound = {};
    while (true) {
      const tagType = this.readByte();
      if (tagType === 0) break;
      const name = this.readString();
      compound[name] = this.readTag(tagType);
    }
    return compound;
  }

  readRoot(): NBTCompound {
    const tagType = this.readByte();
    if (tagType !== 10) throw new Error("Root tag must be a compound");
    this.readString();
    return this.readCompound();
  }
}

export function parseLitematic(buffer: ArrayBuffer): ParsedMaterial[] {
  const decompressed = pako.ungzip(new Uint8Array(buffer));
  const reader = new NBTReader(decompressed.buffer);
  const nbt = reader.readRoot();

  const regions = nbt["Regions"] as NBTCompound;
  const materialCounts: Map<string, number> = new Map();

  for (const regionName of Object.keys(regions)) {
    const region = regions[regionName] as NBTCompound;
    const palette = region["BlockStatePalette"] as NBTCompound[];
    const blockStatesLong = region["BlockStates"] as bigint[];
    const size = region["Size"] as NBTCompound;

    const sizeX = Math.abs(Number(size["x"]));
    const sizeY = Math.abs(Number(size["y"]));
    const sizeZ = Math.abs(Number(size["z"]));
    const totalBlocks = sizeX * sizeY * sizeZ;

    const paletteSize = palette.length;
    const bitsPerEntry = Math.max(2, Math.ceil(Math.log2(paletteSize)));
    const maxEntryValue = BigInt((1 << bitsPerEntry) - 1);

    // Single-pass: decode palette index and count directly, no intermediate array
    let bitIndex = 0;
    for (let i = 0; i < totalBlocks; i++) {
      const startArrIdx = Math.floor(bitIndex / 64);
      const startBit = bitIndex % 64;
      const endBit = startBit + bitsPerEntry - 1;

      let val: bigint;
      if (endBit < 64) {
        val = (blockStatesLong[startArrIdx] >> BigInt(startBit)) & maxEntryValue;
      } else {
        const lowBits = 64 - startBit;
        const lowVal =
          (blockStatesLong[startArrIdx] >> BigInt(startBit)) &
          ((1n << BigInt(lowBits)) - 1n);
        const highVal =
          blockStatesLong[startArrIdx + 1] &
          ((1n << BigInt(bitsPerEntry - lowBits)) - 1n);
        val = lowVal | (highVal << BigInt(lowBits));
      }

      bitIndex += bitsPerEntry;

      const idx = Number(val);
      if (idx >= 0 && idx < paletteSize) {
        const blockName = palette[idx]["Name"] as string;
        if (blockName !== "minecraft:air") {
          materialCounts.set(blockName, (materialCounts.get(blockName) || 0) + 1);
        }
      }
    }
  }

  if (materialCounts.has("minecraft:water")) {
    const water = materialCounts.get("minecraft:water")!;
    materialCounts.set(
      "minecraft:water_bucket",
      (materialCounts.get("minecraft:water_bucket") || 0) + water
    );
    materialCounts.delete("minecraft:water");
  }
  if (materialCounts.has("minecraft:lava")) {
    const lava = materialCounts.get("minecraft:lava")!;
    materialCounts.set(
      "minecraft:lava_bucket",
      (materialCounts.get("minecraft:lava_bucket") || 0) + lava
    );
    materialCounts.delete("minecraft:lava");
  }

  return [...materialCounts.entries()]
    .map(([blockId, count]) => ({ blockId, count }))
    .sort((a, b) => b.count - a.count);
}

