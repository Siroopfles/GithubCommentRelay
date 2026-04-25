"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type CompactModeContextType = {
  isCompactMode: boolean;
  toggleCompactMode: () => void;
};

// Providing a default context that does nothing in SSR
const defaultContext: CompactModeContextType = {
  isCompactMode: false,
  toggleCompactMode: () => {},
};

const CompactModeContext = createContext<CompactModeContextType>(defaultContext);

export function CompactModeProvider({ children }: { children: React.ReactNode }) {
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("compactMode");
    if (saved) {
      setIsCompactMode(saved === "true");
    }
    setIsLoaded(true);
  }, []);

  const toggleCompactMode = () => {
    setIsCompactMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("compactMode", String(newValue));
      return newValue;
    });
  };

  // Give a stable render for hydration
  return (
    <CompactModeContext.Provider value={{ isCompactMode, toggleCompactMode }}>
      <div className={isCompactMode && isLoaded ? "compact-mode" : ""}>{children}</div>
    </CompactModeContext.Provider>
  );
}

export function useCompactMode() {
  const context = useContext(CompactModeContext);
  if (context === undefined) {
    return defaultContext; // Safe fallback
  }
  return context;
}
