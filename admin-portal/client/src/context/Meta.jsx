import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const MetaCtx = createContext(null);

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => { api.get("/meta").then(setMeta).catch(() => {}); }, []);
  return <MetaCtx.Provider value={meta}>{children}</MetaCtx.Provider>;
}

export const useMeta = () => useContext(MetaCtx);
