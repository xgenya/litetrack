"use client";

import { ImgHTMLAttributes, useState, useEffect } from "react";

interface McAvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  username: string;
  size?: number;
}

function buildFallbackDataUrl(username: string, size: number): string {
  const letter = (username[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  const color = `hsl(${hue},55%,45%)`;
  const fontSize = Math.round(size * 0.5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${color}"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" font-weight="bold" fill="white">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function McAvatar({ username, size = 32, className, alt, ...props }: McAvatarProps) {
  const [src, setSrc] = useState(`/api/avatar?username=${encodeURIComponent(username)}&size=${size}`);

  useEffect(() => {
    setSrc(`/api/avatar?username=${encodeURIComponent(username)}&size=${size}`);
  }, [username, size]);

  return (
    <img
      src={src}
      alt={alt ?? username}
      width={size}
      height={size}
      className={className}
      onError={() => setSrc(buildFallbackDataUrl(username, size))}
      {...props}
    />
  );
}
