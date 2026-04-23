import { Claim, Material } from "@/lib/types";
import { formatUser } from "@/lib/utils";
import { getRequiredDisplay } from "@/lib/minecraft";
import { BlockIcon, BlockIconRaw } from "./BlockIcon";
import { McAvatar } from "./McAvatar";

export interface MaterialWithClaims extends Material {
  litematicId: string;
  litematicName: string;
  claimedBoxes: number;
  remainingBoxes: number;
  myClaims: Claim[];
  allClaims: Claim[];
}

export interface LitematicWithMaterials {
  id: string;
  filename: string;
  totalTypes: number;
  materials: MaterialWithClaims[];
}

interface MaterialTableProps {
  litematic: LitematicWithMaterials;
  user: { username: string } | null;
  claiming: string | null;
  onClaim: (litematicId: string, blockId: string, boxes: number) => void;
}

function ClaimList({ claims, currentUser }: { claims: Claim[]; currentUser: string | null }) {
  if (claims.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
  return (
    <div className="space-y-1">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className={`flex items-center gap-1.5 text-xs ${
            currentUser && claim.username === currentUser ? "text-primary font-medium" : "text-muted-foreground"
          }`}
        >
          <McAvatar username={claim.username} size={16} className="w-4 h-4 rounded flex-shrink-0" />
          <span className="truncate max-w-[90px]" title={formatUser(claim.username, claim.nickname)}>
            {formatUser(claim.username, claim.nickname)}
          </span>
          <span className="flex-shrink-0 opacity-60">
            {new Date(claim.createdAt).toLocaleDateString("zh-CN", {
              month: "numeric",
              day: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

function ClaimButton({
  disabled,
  loading,
  done,
  onClaim,
}: {
  disabled: boolean;
  loading: boolean;
  done: boolean;
  onClaim: () => void;
}) {
  if (done) return <span className="text-xs text-muted-foreground">已认领</span>;
  return (
    <button
      onClick={onClaim}
      disabled={disabled}
      className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "..." : "认领"}
    </button>
  );
}

export function MaterialTable({ litematic, user, claiming, onClaim }: MaterialTableProps) {
  return (
    <>
      {/* ── Mobile: card layout ── */}
      <div className="md:hidden divide-y">
        {litematic.materials.map((material, index) => {
          const key = `${litematic.id}-${material.blockId}`;
          const req = getRequiredDisplay(material.count);
          const done = material.remainingBoxes <= 0;

          return (
            <div
              key={key}
              className={`p-3 ${index % 2 === 0 ? "bg-muted/10" : ""}`}
            >
              {/* Row 1: icon + name + action */}
              <div className="flex items-center gap-2 mb-2">
                <BlockIcon blockId={material.blockId} size={28} />
                <span className="font-medium text-sm flex-1 truncate" title={material.displayName}>
                  {material.displayName}
                </span>
                {user ? (
                  <ClaimButton
                    done={done}
                    loading={claiming === key}
                    disabled={claiming === key || done}
                    onClaim={() => onClaim(litematic.id, material.blockId, material.remainingBoxes)}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">登录后认领</span>
                )}
              </div>
              {/* Row 2: stats */}
              <div className="flex items-center gap-3 mb-1.5 text-xs text-muted-foreground">
                <span>数量 <span className="tabular-nums text-foreground">{material.count.toLocaleString()}</span></span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  推荐
                  {req.unit === "box" ? (
                    <span className="inline-flex items-center gap-0.5 text-blue-500 font-medium">
                      {req.value}
                      <BlockIconRaw blockId="minecraft:shulker_box" size={12} />
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium">{req.value} 组</span>
                  )}
                </span>
              </div>
              {/* Row 3: claims */}
              {material.allClaims.length > 0 && (
                <div className="pl-0.5">
                  <ClaimList claims={material.allClaims} currentUser={user?.username ?? null} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Desktop: table layout ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[540px]">
          <thead>
            <tr className="border-b text-left bg-muted/30">
              <th className="p-3 font-medium w-[180px]">材料名称</th>
              <th className="p-3 font-medium text-right w-[100px]">数量</th>
              <th className="p-3 font-medium text-right w-[90px]">推荐备货</th>
              <th className="p-3 font-medium">认领记录</th>
              <th className="p-3 font-medium text-center w-[80px]">操作</th>
            </tr>
          </thead>
          <tbody>
            {litematic.materials.map((material, index) => {
              const key = `${litematic.id}-${material.blockId}`;
              const req = getRequiredDisplay(material.count);

              return (
                <tr
                  key={key}
                  className={`border-b last:border-0 ${index % 2 === 0 ? "bg-muted/10" : ""}`}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <BlockIcon blockId={material.blockId} size={28} />
                      <span className="font-medium text-sm truncate max-w-[130px]" title={material.displayName}>
                        {material.displayName}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    <span className="text-muted-foreground text-sm">
                      {material.count.toLocaleString()}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {req.unit === "box" ? (
                      <span className="inline-flex items-center gap-1 text-blue-500 font-medium">
                        {req.value}
                        <BlockIconRaw blockId="minecraft:shulker_box" size={14} />
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                        {req.value}
                        <span className="text-xs">组</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <ClaimList claims={material.allClaims} currentUser={user?.username ?? null} />
                  </td>
                  <td className="p-3">
                    {user ? (
                      material.remainingBoxes > 0 ? (
                        <div className="flex justify-center">
                          <button
                            onClick={() => onClaim(litematic.id, material.blockId, material.remainingBoxes)}
                            disabled={claiming === key}
                            className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50"
                          >
                            {claiming === key ? "..." : "认领"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground text-sm">-</div>
                      )
                    ) : (
                      <div className="text-center text-muted-foreground text-sm">登录</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

