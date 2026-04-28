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

function svgResponse(svg: string) {
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const username = searchParams.get("username") ?? "";
  const size = parseSize(searchParams.get("size"));

  if (!username) {
    return svgResponse(buildFallbackSvg("?", size));
  }

  const avatarUrls = [
    `https://mc-heads.net/avatar/${encodeURIComponent(username)}/${size}`,
    `https://crafthead.net/avatar/${encodeURIComponent(username)}/${size}`,
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
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
      // this upstream failed, try next
    }
  }

  return svgResponse(buildFallbackSvg(username, size));
}
