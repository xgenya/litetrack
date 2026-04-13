import translations from "./translations.json";

const { blocks, items } = translations as {
  blocks: Record<string, string>;
  items: Record<string, string>;
};

export function getBlockDisplayName(blockId: string): string {
  const id = blockId.startsWith("minecraft:") ? blockId : `minecraft:${blockId}`;
  
  if (blocks[id]) {
    return blocks[id];
  }
  if (items[id]) {
    return items[id];
  }
  
  return blockId.replace("minecraft:", "").replace(/_/g, " ");
}
