// Minecraft vanilla creative tab categories for block classification

const MC_COLORS = [
  "white", "orange", "magenta", "light_blue", "yellow", "lime",
  "pink", "gray", "light_gray", "cyan", "purple", "blue",
  "brown", "green", "red", "black",
];

const COLORED_SUFFIXES = [
  "_wool", "_carpet", "_terracotta", "_glazed_terracotta",
  "_concrete", "_concrete_powder", "_stained_glass", "_stained_glass_pane",
  "_shulker_box", "_bed", "_banner", "_candle",
];

function isColoredBlock(id: string): boolean {
  return MC_COLORS.some((color) =>
    COLORED_SUFFIXES.some((suffix) => id === `${color}${suffix}`)
  );
}

// ── Redstone ────────────────────────────────────────────────────────────────

const REDSTONE_EXACT = new Set([
  "redstone", "redstone_torch", "redstone_wall_torch", "redstone_block", "redstone_lamp",
  "repeater", "comparator", "observer",
  "piston", "sticky_piston",
  "slime_block", "honey_block",
  "hopper", "dropper", "dispenser",
  "lever", "note_block", "daylight_detector", "target",
  "tripwire_hook", "tripwire",
  "tnt", "trapped_chest",
  "powered_rail", "detector_rail", "activator_rail", "rail",
  "sculk_sensor", "calibrated_sculk_sensor",
  "lightning_rod",
  "copper_bulb", "exposed_copper_bulb", "weathered_copper_bulb", "oxidized_copper_bulb",
  "waxed_copper_bulb", "waxed_exposed_copper_bulb", "waxed_weathered_copper_bulb", "waxed_oxidized_copper_bulb",
]);

function isRedstone(id: string): boolean {
  if (REDSTONE_EXACT.has(id)) return true;
  if (id.endsWith("_button")) return true;
  if (id.endsWith("_pressure_plate")) return true;
  return false;
}

// ── Natural Blocks ───────────────────────────────────────────────────────────

const NATURAL_EXACT = new Set([
  // Dirt / soil
  "grass_block", "dirt", "coarse_dirt", "rooted_dirt", "podzol", "mycelium", "mud",
  // Raw stone (unprocessed)
  "stone", "cobblestone", "mossy_cobblestone", "granite", "diorite", "andesite",
  "deepslate", "tuff", "calcite", "dripstone_block", "pointed_dripstone",
  // Sand / gravel / clay
  "sand", "red_sand", "gravel", "clay",
  // Ice / snow
  "ice", "packed_ice", "blue_ice", "snow_block", "powder_snow", "snow",
  // Nether natural
  "netherrack", "soul_sand", "soul_soil", "magma_block",
  "nether_quartz_ore", "nether_gold_ore", "ancient_debris",
  "nether_wart_block", "warped_wart_block", "shroomlight",
  // End natural
  "end_stone", "chorus_flower", "chorus_plant",
  // Aquatic
  "sponge", "wet_sponge", "sea_pickle", "lily_pad",
  "kelp", "kelp_plant", "seagrass", "tall_seagrass",
  // Vegetation
  "cactus", "sugar_cane", "bamboo", "bamboo_sapling",
  "grass", "tall_grass", "fern", "large_fern", "dead_bush",
  "vine", "glow_lichen",
  "weeping_vines", "weeping_vines_plant", "twisting_vines", "twisting_vines_plant",
  // Flowers
  "dandelion", "poppy", "blue_orchid", "allium", "azure_bluet",
  "red_tulip", "orange_tulip", "white_tulip", "pink_tulip",
  "oxeye_daisy", "cornflower", "lily_of_the_valley", "wither_rose",
  "sunflower", "lilac", "rose_bush", "peony",
  "torchflower", "pitcher_plant", "pitcher_pod", "pink_petals",
  "short_grass", "wildflowers", "leaf_litter", "cactus_flower",
  // Mushrooms
  "brown_mushroom", "red_mushroom", "brown_mushroom_block", "red_mushroom_block", "mushroom_stem",
  "crimson_fungus", "warped_fungus", "nether_sprouts",
  // Sculk
  "sculk", "sculk_vein", "sculk_catalyst", "sculk_shrieker",
  // Moss / azalea
  "moss_block", "moss_carpet", "azalea", "flowering_azalea", "spore_blossom",
  // Mangrove
  "mangrove_roots", "muddy_mangrove_roots",
  // Natural produce
  "pumpkin", "melon",
  "frogspawn",
]);

function isNatural(id: string): boolean {
  if (NATURAL_EXACT.has(id)) return true;
  if (id.endsWith("_ore")) return true;
  if (id.endsWith("_leaves")) return true;
  if (id.endsWith("_sapling")) return true;
  if (id.endsWith("_nylium")) return true;
  if (id.includes("coral")) return true;
  return false;
}

// ── Functional Blocks ────────────────────────────────────────────────────────

const FUNCTIONAL_EXACT = new Set([
  // Crafting / processing
  "crafting_table", "stonecutter", "grindstone", "cartography_table", "loom",
  "fletching_table", "smithing_table",
  "furnace", "blast_furnace", "smoker", "campfire", "soul_campfire",
  // Storage
  "chest", "ender_chest", "barrel", "shulker_box",
  // Utility
  "anvil", "chipped_anvil", "damaged_anvil",
  "enchanting_table", "bookshelf", "chiseled_bookshelf", "lectern",
  "brewing_stand", "cauldron", "lava_cauldron", "water_cauldron", "powder_snow_cauldron",
  "beehive", "bee_nest", "bell", "jukebox", "composter",
  "conduit", "beacon", "respawn_anchor", "lodestone", "end_portal_frame",
  // Lighting
  "lantern", "soul_lantern",
  "torch", "soul_torch", "wall_torch", "soul_wall_torch",
  "glowstone", "sea_lantern", "jack_o_lantern",
  // Decoration
  "ladder", "scaffolding",
  "flower_pot", "painting", "item_frame", "glow_item_frame", "armor_stand",
  "decorated_pot", "carved_pumpkin",
]);

function isFunctional(id: string): boolean {
  if (FUNCTIONAL_EXACT.has(id)) return true;
  if (id.endsWith("_sign")) return true;
  if (id.endsWith("_wall_sign")) return true;
  if (id.endsWith("_hanging_sign")) return true;
  if (id.endsWith("_wall_hanging_sign")) return true;
  if (id.endsWith("_door")) return true;
  if (id.endsWith("_trapdoor")) return true;
  if (id.endsWith("_fence_gate")) return true;
  return false;
}

// ── Building Blocks ──────────────────────────────────────────────────────────

const BUILDING_EXACT = new Set([
  // Polished / processed stone
  "smooth_stone", "stone_bricks", "mossy_stone_bricks", "cracked_stone_bricks", "chiseled_stone_bricks",
  "cobbled_deepslate", "polished_deepslate", "chiseled_deepslate",
  "deepslate_bricks", "deepslate_tiles", "cracked_deepslate_bricks", "cracked_deepslate_tiles",
  "polished_granite", "polished_diorite", "polished_andesite",
  "basalt", "smooth_basalt", "polished_basalt",
  "sandstone", "red_sandstone",
  "smooth_sandstone", "smooth_red_sandstone",
  "cut_sandstone", "cut_red_sandstone",
  "chiseled_sandstone", "chiseled_red_sandstone",
  "terracotta", "bricks",
  "packed_mud", "mud_bricks",
  "tuff_bricks", "polished_tuff", "chiseled_tuff", "chiseled_tuff_bricks",
  "prismarine", "prismarine_bricks", "dark_prismarine",
  "purpur_block", "purpur_pillar", "end_stone_bricks",
  "nether_bricks", "cracked_nether_bricks", "chiseled_nether_bricks", "red_nether_bricks",
  "quartz_block", "quartz_bricks", "quartz_pillar", "chiseled_quartz_block",
  "smooth_quartz", "smooth_quartz_block",
  "blackstone", "polished_blackstone", "gilded_blackstone",
  "chiseled_polished_blackstone", "polished_blackstone_bricks", "cracked_polished_blackstone_bricks",
  "obsidian", "crying_obsidian",
  // Mineral blocks
  "iron_block", "gold_block", "diamond_block", "emerald_block",
  "lapis_block", "coal_block", "netherite_block",
  "amethyst_block", "budding_amethyst",
  "bone_block", "hay_block", "dried_kelp_block", "honeycomb_block",
  // Copper
  "copper_block", "exposed_copper", "weathered_copper", "oxidized_copper",
  "cut_copper", "exposed_cut_copper", "weathered_cut_copper", "oxidized_cut_copper",
  "copper_grate", "exposed_copper_grate", "weathered_copper_grate", "oxidized_copper_grate",
  "chiseled_copper", "exposed_chiseled_copper", "weathered_chiseled_copper", "oxidized_chiseled_copper",
  "waxed_copper_block", "waxed_exposed_copper", "waxed_weathered_copper", "waxed_oxidized_copper",
  "waxed_cut_copper", "waxed_exposed_cut_copper", "waxed_weathered_cut_copper", "waxed_oxidized_cut_copper",
  "waxed_copper_grate", "waxed_exposed_copper_grate", "waxed_weathered_copper_grate", "waxed_oxidized_copper_grate",
  "waxed_chiseled_copper", "waxed_exposed_chiseled_copper", "waxed_weathered_chiseled_copper", "waxed_oxidized_chiseled_copper",
  // Glass
  "glass", "glass_pane", "tinted_glass",
  // Metal structural
  "iron_bars", "chain",
  // Misc building
  "jack_o_lantern",
  // Resin (1.21.4+)
  "resin_block", "resin_bricks", "chiseled_resin_bricks",
]);

function isBuilding(id: string): boolean {
  if (BUILDING_EXACT.has(id)) return true;
  if (id.endsWith("_planks")) return true;
  if (id.endsWith("_log")) return true;
  if (id.endsWith("_wood")) return true;
  if (id.startsWith("stripped_")) return true;
  if (id.endsWith("_slab")) return true;
  if (id.endsWith("_stairs")) return true;
  if (id.endsWith("_wall")) return true;
  if (id.endsWith("_fence") && !id.endsWith("_fence_gate")) return true;
  return false;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const CATEGORY_ORDER = [
  "建筑方块",
  "彩色方块",
  "自然方块",
  "功能方块",
  "红石",
  "其他",
] as const;

export type BlockCategoryName = (typeof CATEGORY_ORDER)[number];

export function getBlockCategory(blockId: string): BlockCategoryName {
  const id = blockId.startsWith("minecraft:") ? blockId.slice(10) : blockId;

  // Priority order: redstone → colored → natural → functional → building → other
  if (isRedstone(id)) return "红石";
  if (isColoredBlock(id)) return "彩色方块";
  if (isNatural(id)) return "自然方块";
  if (isFunctional(id)) return "功能方块";
  if (isBuilding(id)) return "建筑方块";
  return "其他";
}
