import React, { useState, useEffect, useContext, createContext } from "react";
const C = createContext(null);
function read(key, def) {
  try {
    return JSON.parse(localStorage.getItem("pd:" + key)) ?? def;
  } catch {
    return def;
  }
}
function local(key, initial) {
  const [v, s] = useState(() => read(key, initial));
  useEffect(() => {
    try {
      localStorage.setItem("pd:" + key, JSON.stringify(v));
    } catch {}
  }, [v]);
  return [v, s];
}
export function Library({ children }) {
  const [theme, T] = local("theme", "light"),
    [saves, S] = local("saved", []),
    [recent, R] = local("recent", []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function toggle(x) {
    S((v) =>
      v.some((y) => y.path === x.path)
        ? v.filter((y) => y.path !== x.path)
        : [x, ...v],
    );
  }
  function visit(x) {
    R((v) => [x, ...v.filter((y) => y.path !== x.path)].slice(0, 8));
  }
  return (
    <C.Provider
      value={{
        theme,
        swap: () => T(theme === "light" ? "dark" : "light"),
        saves,
        toggle,
        recent,
        visit,
      }}
    >
      {children}
    </C.Provider>
  );
}
export const useLibrary = () => useContext(C);
