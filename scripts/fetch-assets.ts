import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const MC_VERSION = "1.21";
const LANG_URL = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/${MC_VERSION}/assets/minecraft/lang/zh_cn.json`;
const CLIENT_JAR_URL = "https://piston-data.mojang.com/v1/objects/0e9a07b9bb3390602f977073aa12884a4ce12431/client.jar";

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

async function downloadAndExtractTextures() {
  const tempDir = path.join(process.cwd(), "temp");
  const jarPath = path.join(tempDir, "client.jar");
  const texturesDir = path.join(process.cwd(), "public/textures");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  if (!fs.existsSync(texturesDir)) {
    fs.mkdirSync(texturesDir, { recursive: true });
  }

  console.log("\nDownloading Minecraft client.jar...");
  const response = await fetch(CLIENT_JAR_URL);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(jarPath, Buffer.from(buffer));
  console.log("Downloaded client.jar");

  console.log("\nExtracting textures...");
  const extractDir = path.join(tempDir, "extracted");
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  execSync(`unzip -o -q "${jarPath}" "assets/minecraft/textures/block/*" "assets/minecraft/textures/item/*" -d "${extractDir}"`, {
    stdio: "inherit",
  });

  const blockTexturesDir = path.join(extractDir, "assets/minecraft/textures/block");
  const itemTexturesDir = path.join(extractDir, "assets/minecraft/textures/item");

  let copied = 0;

  if (fs.existsSync(blockTexturesDir)) {
    const files = fs.readdirSync(blockTexturesDir);
    for (const file of files) {
      if (file.endsWith(".png")) {
        fs.copyFileSync(
          path.join(blockTexturesDir, file),
          path.join(texturesDir, file)
        );
        copied++;
      }
    }
  }

  if (fs.existsSync(itemTexturesDir)) {
    const files = fs.readdirSync(itemTexturesDir);
    for (const file of files) {
      if (file.endsWith(".png") && !fs.existsSync(path.join(texturesDir, file))) {
        fs.copyFileSync(
          path.join(itemTexturesDir, file),
          path.join(texturesDir, file)
        );
        copied++;
      }
    }
  }

  console.log(`Copied ${copied} texture files`);

  console.log("\nCleaning up...");
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log("Done!");
}

async function main() {
  await fetchLanguageFile();
  await downloadAndExtractTextures();
}

main().catch(console.error);
