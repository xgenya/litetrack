import { ImgHTMLAttributes } from "react";

interface McAvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  username: string;
  size?: number;
}

export function McAvatar({ username, size = 32, className, alt, ...props }: McAvatarProps) {
  return (
    <img
      src={`https://mc-heads.net/avatar/${username}/${size}`}
      alt={alt ?? username}
      width={size}
      height={size}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/MHF_Steve/${size}`;
      }}
      {...props}
    />
  );
}
