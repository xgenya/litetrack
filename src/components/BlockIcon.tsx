"use client";

import { useState, useEffect } from "react";

interface BlockIconProps {
  blockId: string;
  size?: number;
}

interface TextureData {
  readable: string;
  texture: string;
}

interface TexturesJson {
  items: Record<string, TextureData>;
  blocks?: Record<string, TextureData>;
}

let texturesCache: TexturesJson | null = null;
let loadingPromise: Promise<TexturesJson> | null = null;

async function loadTextures(): Promise<TexturesJson> {
  if (texturesCache) return texturesCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = import("minecraft-textures/dist/textures/json/1.21.id.json").then(
    (module) => {
      texturesCache = module.default as TexturesJson;
      return texturesCache;
    }
  );

  return loadingPromise;
}

const BLOCK_ALIASES: Record<string, string> = {
  "grass": "short_grass",
  "tall_grass": "tall_grass",
  "piston_head": "piston",
  "sticky_piston_head": "sticky_piston",
  "moving_piston": "piston",
  "wall_torch": "torch",
  "soul_wall_torch": "soul_torch",
  "redstone_wall_torch": "redstone_torch",
  "oak_wall_sign": "oak_sign",
  "spruce_wall_sign": "spruce_sign",
  "birch_wall_sign": "birch_sign",
  "jungle_wall_sign": "jungle_sign",
  "acacia_wall_sign": "acacia_sign",
  "dark_oak_wall_sign": "dark_oak_sign",
  "mangrove_wall_sign": "mangrove_sign",
  "cherry_wall_sign": "cherry_sign",
  "bamboo_wall_sign": "bamboo_sign",
  "crimson_wall_sign": "crimson_sign",
  "warped_wall_sign": "warped_sign",
  "oak_wall_hanging_sign": "oak_hanging_sign",
  "spruce_wall_hanging_sign": "spruce_hanging_sign",
  "birch_wall_hanging_sign": "birch_hanging_sign",
  "jungle_wall_hanging_sign": "jungle_hanging_sign",
  "acacia_wall_hanging_sign": "acacia_hanging_sign",
  "dark_oak_wall_hanging_sign": "dark_oak_hanging_sign",
  "mangrove_wall_hanging_sign": "mangrove_hanging_sign",
  "cherry_wall_hanging_sign": "cherry_hanging_sign",
  "bamboo_wall_hanging_sign": "bamboo_hanging_sign",
  "crimson_wall_hanging_sign": "crimson_hanging_sign",
  "warped_wall_hanging_sign": "warped_hanging_sign",
  "white_wall_banner": "white_banner",
  "orange_wall_banner": "orange_banner",
  "magenta_wall_banner": "magenta_banner",
  "light_blue_wall_banner": "light_blue_banner",
  "yellow_wall_banner": "yellow_banner",
  "lime_wall_banner": "lime_banner",
  "pink_wall_banner": "pink_banner",
  "gray_wall_banner": "gray_banner",
  "light_gray_wall_banner": "light_gray_banner",
  "cyan_wall_banner": "cyan_banner",
  "purple_wall_banner": "purple_banner",
  "blue_wall_banner": "blue_banner",
  "brown_wall_banner": "brown_banner",
  "green_wall_banner": "green_banner",
  "red_wall_banner": "red_banner",
  "black_wall_banner": "black_banner",
  "skeleton_wall_skull": "skeleton_skull",
  "wither_skeleton_wall_skull": "wither_skeleton_skull",
  "zombie_wall_head": "zombie_head",
  "player_wall_head": "player_head",
  "creeper_wall_head": "creeper_head",
  "dragon_wall_head": "dragon_head",
  "piglin_wall_head": "piglin_head",
  "attached_melon_stem": "melon_seeds",
  "attached_pumpkin_stem": "pumpkin_seeds",
  "melon_stem": "melon_seeds",
  "pumpkin_stem": "pumpkin_seeds",
  "potted_oak_sapling": "oak_sapling",
  "potted_spruce_sapling": "spruce_sapling",
  "potted_birch_sapling": "birch_sapling",
  "potted_jungle_sapling": "jungle_sapling",
  "potted_acacia_sapling": "acacia_sapling",
  "potted_dark_oak_sapling": "dark_oak_sapling",
  "potted_cherry_sapling": "cherry_sapling",
  "potted_mangrove_propagule": "mangrove_propagule",
  "potted_fern": "fern",
  "potted_dandelion": "dandelion",
  "potted_poppy": "poppy",
  "potted_blue_orchid": "blue_orchid",
  "potted_allium": "allium",
  "potted_azure_bluet": "azure_bluet",
  "potted_red_tulip": "red_tulip",
  "potted_orange_tulip": "orange_tulip",
  "potted_white_tulip": "white_tulip",
  "potted_pink_tulip": "pink_tulip",
  "potted_oxeye_daisy": "oxeye_daisy",
  "potted_cornflower": "cornflower",
  "potted_lily_of_the_valley": "lily_of_the_valley",
  "potted_wither_rose": "wither_rose",
  "potted_red_mushroom": "red_mushroom",
  "potted_brown_mushroom": "brown_mushroom",
  "potted_dead_bush": "dead_bush",
  "potted_cactus": "cactus",
  "potted_bamboo": "bamboo",
  "potted_crimson_fungus": "crimson_fungus",
  "potted_warped_fungus": "warped_fungus",
  "potted_crimson_roots": "crimson_roots",
  "potted_warped_roots": "warped_roots",
  "potted_azalea_bush": "azalea",
  "potted_flowering_azalea_bush": "flowering_azalea",
  "potted_torchflower": "torchflower",
  "cave_vines": "glow_berries",
  "cave_vines_plant": "glow_berries",
  "big_dripleaf_stem": "big_dripleaf",
  "tall_seagrass": "seagrass",
  "water": "water_bucket",
  "lava": "lava_bucket",
  "fire": "flint_and_steel",
  "soul_fire": "soul_torch",
  "frosted_ice": "ice",
  "powder_snow": "powder_snow_bucket",
  "bubble_column": "water_bucket",
  "nether_portal": "obsidian",
  "end_portal": "ender_eye",
  "end_gateway": "ender_eye",
  "tripwire": "string",
};

function getTextureSync(blockId: string): string | null {
  if (!texturesCache) return null;

  let id = blockId.startsWith("minecraft:") ? blockId : `minecraft:${blockId}`;
  let shortId = id.replace("minecraft:", "");

  if (BLOCK_ALIASES[shortId]) {
    id = `minecraft:${BLOCK_ALIASES[shortId]}`;
    shortId = BLOCK_ALIASES[shortId];
  }

  if (texturesCache.blocks?.[id]) {
    return texturesCache.blocks[id].texture;
  }

  if (texturesCache.items?.[id]) {
    return texturesCache.items[id].texture;
  }

  for (const key of Object.keys(texturesCache.items || {})) {
    const keyShort = key.replace("minecraft:", "");
    if (keyShort === shortId) {
      return texturesCache.items[key].texture;
    }
  }

  return null;
}

export function BlockIconRaw({ blockId, size = 16 }: BlockIconProps) {
  const [texture, setTexture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const cachedTexture = getTextureSync(blockId);
    if (cachedTexture) {
      setTexture(cachedTexture);
      setLoading(false);
      return;
    }

    loadTextures().then(() => {
      if (!mounted) return;
      const tex = getTextureSync(blockId);
      if (tex) {
        setTexture(tex);
      } else {
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [blockId]);

  if (loading || error || !texture) {
    return null;
  }

  return (
    <img
      src={texture}
      alt={blockId.replace("minecraft:", "")}
      width={size}
      height={size}
      className="block-icon inline-block align-middle"
      draggable={false}
    />
  );
}

export function BlockIcon({ blockId, size = 32 }: BlockIconProps) {
  const [texture, setTexture] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const cachedTexture = getTextureSync(blockId);
    if (cachedTexture) {
      setTexture(cachedTexture);
      setLoading(false);
      return;
    }

    loadTextures().then(() => {
      if (!mounted) return;
      const tex = getTextureSync(blockId);
      if (tex) {
        setTexture(tex);
      } else {
        console.warn(`[BlockIcon] No texture found for: ${blockId}`);
        setError(true);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [blockId]);

  const slotStyle = {
    width: size + 8,
    height: size + 8,
    backgroundColor: "#8b8b8b",
    borderTop: "2px solid #373737",
    borderLeft: "2px solid #373737",
    borderBottom: "2px solid #ffffff",
    borderRight: "2px solid #ffffff",
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center flex-shrink-0 animate-pulse"
        style={slotStyle}
      />
    );
  }

  if (error || !texture) {
    return (
      <div
        className="flex items-center justify-center text-xs flex-shrink-0"
        style={{ ...slotStyle, color: "#555" }}
      >
        ?
      </div>
    );
  }

  return (
    <div 
      className="flex-shrink-0 flex items-center justify-center"
      style={slotStyle}
    >
      <img
        src={texture}
        alt={blockId.replace("minecraft:", "")}
        width={size}
        height={size}
        className="block-icon"
        draggable={false}
      />
    </div>
  );
}
