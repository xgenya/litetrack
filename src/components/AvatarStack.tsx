import { McAvatar } from "./McAvatar";

interface AvatarStackProps {
  usernames: string[];
  max?: number;
}

export function AvatarStack({ usernames, max = 5 }: AvatarStackProps) {
  const displayed = usernames.slice(0, max);
  const remaining = usernames.length - max;

  return (
    <div className="flex -space-x-2">
      {displayed.map((username, index) => (
        <McAvatar
          key={username}
          username={username}
          size={32}
          title={username}
          className="w-6 h-6 rounded border-2 border-background block-icon"
          style={{ zIndex: displayed.length - index }}
        />
      ))}
      {remaining > 0 && (
        <div
          className="w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs"
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
