import * as fs from "fs";
import * as path from "path";

const MC_VERSION = "1.21.11";
const LANG_URL = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/${MC_VERSION}/assets/minecraft/lang/zh_cn.json`;

async function fetchLanguageFile() {
  console.log("Fetching language file...");
  const response = await fetch(LANG_URL);
  const data = await response.json();

  const blockTranslations: Record<string, string> = {};
  const itemTranslations: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith("block.minecraft.")) {
      const blockId = key.replace("block.minecraft.", "minecraft:");
      blockTranslations[blockId] = value as string;
    }
    if (key.startsWith("item.minecraft.")) {
      const itemId = key.replace("item.minecraft.", "minecraft:");
      itemTranslations[itemId] = value as string;
    }
  }

  const outputPath = path.join(process.cwd(), "src/lib/translations.json");
  fs.writeFileSync(
    outputPath,
    JSON.stringify({ blocks: blockTranslations, items: itemTranslations }, null, 2)
  );
  console.log(`Saved translations to ${outputPath}`);
  console.log(`Total blocks: ${Object.keys(blockTranslations).length}`);
  console.log(`Total items: ${Object.keys(itemTranslations).length}`);
}

fetchLanguageFile().catch(console.error);
