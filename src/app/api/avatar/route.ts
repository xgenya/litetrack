import { NextRequest, NextResponse } from "next/server";

const ALLOWED_SIZES = [8, 16, 24, 32, 48, 64, 128];
const DEFAULT_SIZE = 32;

function parseSize(raw: string | null): number {
  const n = parseInt(raw ?? "", 10);
  if (!ALLOWED_SIZES.includes(n)) return DEFAULT_SIZE;
  return n;
}

function usernameColor(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function buildFallbackSvg(username: string, size: number): string {
  const letter = (username[0] ?? "?").toUpperCase();
  const color = usernameColor(username);
  const fontSize = Math.round(size * 0.5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
        font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${letter}</text>
</svg>`;
}

function svgResponse(svg: string, maxAge: number) {
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=60`,
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const username = searchParams.get("username") ?? "";
  const size = parseSize(searchParams.get("size"));

  if (!username) {
    return svgResponse(buildFallbackSvg("?", size), 60);
  }

  // Validate against Mojang API — only real Minecraft accounts get a skin.
  // mc-heads.net returns HTTP 200 + Steve for unknown usernames, so we must
  // verify the account exists before fetching the avatar.
  let uuid: string | null = null;
  try {
    const profileRes = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (profileRes.ok) {
      const profile = await profileRes.json();
      uuid = profile?.id ?? null;
    }
  } catch {
    // Mojang API unreachable — fall through to SVG
  }

  if (uuid) {
    const avatarUrls = [
      `https://crafatar.com/avatars/${uuid}?size=${size}&overlay`,
      `https://mc-heads.net/avatar/${uuid}/${size}`,
    ];
    for (const url of avatarUrls) {
      try {
        const upstream = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (upstream.ok) {
          const buffer = await upstream.arrayBuffer();
          const contentType = upstream.headers.get("Content-Type") ?? "image/png";
          return new NextResponse(buffer, {
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
            },
          });
        }
      } catch {
        // this upstream failed, try next
      }
    }
  }

  // Not a Minecraft account or all upstreams failed — show letter avatar
  return svgResponse(buildFallbackSvg(username, size), uuid ? 300 : 3600);
}
