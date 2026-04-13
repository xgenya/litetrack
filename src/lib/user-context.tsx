"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "./types";

interface UserContextType {
  user: User | null;
  login: (username: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("mc_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("mc_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (username: string) => {
    const avatarUrl = `https://mc-heads.net/avatar/${username}/64`;
    const newUser: User = { username, avatarUrl };
    setUser(newUser);
    localStorage.setItem("mc_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mc_user");
  };

  return (
    <UserContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
