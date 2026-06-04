import {
  ELAYOAI_THEME_KEY,
  LEGACY_ORGFLOW_THEME_KEY,
} from "@/lib/elayoai/keys";

/** Runs before paint to avoid theme flash; loaded via next/script beforeInteractive. */
export const THEME_INIT_SCRIPT = `(function(){try{var k="${ELAYOAI_THEME_KEY}",o="${LEGACY_ORGFLOW_THEME_KEY}";var s=localStorage.getItem(k);if(s===null){var l=localStorage.getItem(o);if(l!==null){localStorage.setItem(k,l);s=l;}}var d=window.matchMedia("(prefers-color-scheme: dark)").matches;var dark=s==="dark"||(s==="system"&&d);document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`;
