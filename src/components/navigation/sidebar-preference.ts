export const sidebarStorageKey = "poli-sidebar";

/**
 * Runs in <head>, before the first paint. The pages are prerendered, so the server cannot know
 * whether this browser folded the sidebar: the folded look hangs on this attribute of <html>
 * (the `sidebar-folded` variant in globals.css), and React only catches up after hydration.
 */
export const sidebarPreferenceScript = `try{if(localStorage.getItem("${sidebarStorageKey}")==="folded")document.documentElement.dataset.sidebar="folded"}catch(e){}`;
