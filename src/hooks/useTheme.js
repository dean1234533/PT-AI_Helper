import { useState, useEffect, useCallback } from 'react';

export const THEMES = [
  { id: 'slate',    label: 'Slate',    color: '#020617' },
  { id: 'navy',     label: 'Navy',     color: '#020c24' },
  { id: 'purple',   label: 'Purple',   color: '#0c0520' },
  { id: 'forest',   label: 'Forest',   color: '#021409' },
  { id: 'charcoal', label: 'Charcoal', color: '#080808' },
  { id: 'wine',     label: 'Wine',     color: '#150408' },
];

const STORAGE_KEY = 'dbsai_bg_theme';

// Apply immediately on module load to avoid flash of unstyled background
;(function () {
  const saved = localStorage.getItem(STORAGE_KEY) || 'slate';
  const theme = THEMES.find(t => t.id === saved) || THEMES[0];
  document.documentElement.style.setProperty('--bg-page', theme.color);
})();

export function useTheme() {
  const [themeId, setThemeId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'slate'
  );

  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    document.documentElement.style.setProperty('--bg-page', theme.color);
  }, [themeId]);

  const setTheme = useCallback((id) => {
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return { themeId, setTheme };
}
