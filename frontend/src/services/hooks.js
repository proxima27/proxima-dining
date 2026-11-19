import { useEffect, useState } from "react";
import { api } from "./api";
export function useData(url, version = 0) {
  const [r, set] = useState({ url: null });
  useEffect(() => {
    let active = true;
    const c = new AbortController();
    if (url)
      api
        .get(url, { signal: c.signal })
        .then(({ data }) => {
          if (active) set({ url, data });
        })
        .catch((e) => {
          if (active)
            set({
              url,
              error:
                e.response?.status === 404
                  ? "This entry could not be found."
                  : "We couldn’t load this collection. Please try again.",
            });
        });
    return () => {
      active = false;
      c.abort();
    };
  }, [url, version]);
  return !url ? { data: null } : r.url !== url ? { loading: true } : r;
}
export function params(o) {
  return new URLSearchParams(
    Object.entries(o).filter(([k, v]) => v !== "" && v != null),
  ).toString();
}
