"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/user-context";
import { TopBar } from "@/components/TopBar";
import { McAvatar } from "@/components/McAvatar";
import { Eye, EyeOff, KeyRound, UserRound, LogOut } from "lucide-react";

export default function MePage() {
  const { user, updateNickname, logout } = useUser();

  // Nickname state
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMsg, setNicknameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) setNicknameInput(user.nickname ?? "");
  }, [user]);

  const handleNicknameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNicknameSaving(true);
    setNicknameMsg(null);
    try {
      await updateNickname(nicknameInput);
      setNicknameMsg({ ok: true, text: "昵称已保存" });
    } catch (err) {
      setNicknameMsg({ ok: false, text: (err as Error).message });
    } finally {
      setNicknameSaving(false);
      setTimeout(() => setNicknameMsg(null), 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ ok: false, text: "两次输入的新密码不一致" });
      return;
    }
    setPasswordSaving(true);
    setPasswordMsg(null);
    try {
      const res = await fetch("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setOldPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowOld(false);
        setShowNew(false);
        setShowConfirmNew(false);
        setPasswordMsg({ ok: true, text: "密码已修改" });
      } else {
        setPasswordMsg({ ok: false, text: data.error || "修改失败" });
      }
    } catch {
      setPasswordMsg({ ok: false, text: "网络错误" });
    } finally {
      setPasswordSaving(false);
      setTimeout(() => setPasswordMsg(null), 4000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar title="我的主页" />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center text-muted-foreground">
          请先登录
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar title="我的主页" />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Profile Card */}
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center gap-4">
            <McAvatar
              username={user.username}
              size={64}
              className="w-14 h-14 rounded-lg flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base">{user.username}</span>
                {user.isAdmin && (
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                    管理员
                  </span>
                )}
              </div>
              {user.nickname && (
                <p className="text-sm text-muted-foreground mt-0.5">{user.nickname}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nickname Card */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
            <UserRound className="w-4 h-4" />
            修改昵称
          </h2>
          <form onSubmit={handleNicknameSave} className="space-y-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">昵称</label>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="未设置"
                maxLength={20}
                className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={nicknameSaving}
              />
            </div>
            {nicknameMsg && (
              <p className={`text-sm ${nicknameMsg.ok ? "text-green-600" : "text-destructive"}`}>
                {nicknameMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={nicknameSaving || nicknameInput === (user.nickname ?? "")}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {nicknameSaving ? "保存中…" : "保存昵称"}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold text-base flex items-center gap-2 mb-4">
            <KeyRound className="w-4 h-4" />
            修改密码
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: "原密码", value: oldPassword, setter: setOldPassword, show: showOld, toggleShow: () => setShowOld(v => !v) },
              { label: "新密码", value: newPassword, setter: setNewPassword, show: showNew, toggleShow: () => setShowNew(v => !v) },
              { label: "确认新密码", value: confirmNewPassword, setter: setConfirmNewPassword, show: showConfirmNew, toggleShow: () => setShowConfirmNew(v => !v) },
            ].map(({ label, value, setter, show, toggleShow }) => (
              <div key={label}>
                <label className="block text-sm text-muted-foreground mb-1">{label}</label>
                <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-ring bg-background">
                  <input
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="flex-1 px-3 py-2 bg-transparent border-0 rounded-none text-sm focus:outline-none focus:ring-0"
                    required
                  />
                  <button type="button" onClick={toggleShow} className="px-3 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            {passwordMsg && (
              <p className={`text-sm ${passwordMsg.ok ? "text-green-600" : "text-destructive"}`}>
                {passwordMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={passwordSaving || !oldPassword || !newPassword || !confirmNewPassword}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordSaving ? "修改中…" : "修改密码"}
            </button>
          </form>
        </div>

        {/* Logout */}
        <div className="pt-2">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

      </div>
    </div>
  );
}
