import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api/api';
import { getCoverColors } from '../api/cardCoverApi';

// Trello ka fixed cover palette. DB (dbo.CardCoverColors) se colors na aaye to yahi use hota hai.
export const DEFAULT_COVER_COLORS = [
  { colorKey: 'green', colorName: 'Green', hexCode: '#4BCE97', textHexCode: '#172B4D' },
  { colorKey: 'yellow', colorName: 'Yellow', hexCode: '#EED12B', textHexCode: '#172B4D' },
  { colorKey: 'orange', colorName: 'Orange', hexCode: '#FCA700', textHexCode: '#172B4D' },
  { colorKey: 'red', colorName: 'Red', hexCode: '#F87168', textHexCode: '#172B4D' },
  { colorKey: 'purple', colorName: 'Purple', hexCode: '#C97CF4', textHexCode: '#172B4D' },
  { colorKey: 'blue', colorName: 'Blue', hexCode: '#669DF1', textHexCode: '#172B4D' },
  { colorKey: 'sky', colorName: 'Sky', hexCode: '#6CC3E0', textHexCode: '#172B4D' },
  { colorKey: 'lime', colorName: 'Lime', hexCode: '#94C748', textHexCode: '#172B4D' },
  { colorKey: 'pink', colorName: 'Pink', hexCode: '#E774BB', textHexCode: '#172B4D' },
  { colorKey: 'black', colorName: 'Gray', hexCode: '#8C8F97', textHexCode: '#172B4D' },
];

const DEFAULT_COLOR_MAP = Object.fromEntries(
  DEFAULT_COVER_COLORS.map((c) => [c.colorKey, c]),
);

const PATTERN_INK = 'rgba(9, 30, 66, 0.28)';

// Colorblind friendly mode me har color ka alag pattern (Trello jaisa)
const COLORBLIND_PATTERNS = {
  green: `repeating-linear-gradient(45deg, ${PATTERN_INK} 0 2px, transparent 2px 8px)`,
  yellow: `radial-gradient(${PATTERN_INK} 1.5px, transparent 1.6px) 0 0 / 8px 8px`,
  orange: `repeating-linear-gradient(0deg, ${PATTERN_INK} 0 2px, transparent 2px 7px)`,
  red: `repeating-linear-gradient(90deg, ${PATTERN_INK} 0 2px, transparent 2px 7px)`,
  purple: `repeating-linear-gradient(45deg, ${PATTERN_INK} 0 2px, transparent 2px 8px), repeating-linear-gradient(-45deg, ${PATTERN_INK} 0 2px, transparent 2px 8px)`,
  blue: `repeating-linear-gradient(-45deg, ${PATTERN_INK} 0 2px, transparent 2px 8px)`,
  sky: `repeating-linear-gradient(45deg, ${PATTERN_INK} 0 5px, transparent 5px 14px)`,
  lime: `conic-gradient(${PATTERN_INK} 25%, transparent 0 50%, ${PATTERN_INK} 0 75%, transparent 0) 0 0 / 10px 10px`,
  pink: `radial-gradient(circle, ${PATTERN_INK} 2.5px, transparent 2.6px) 0 0 / 12px 12px`,
  black: `linear-gradient(${PATTERN_INK} 2px, transparent 2px) 0 0 / 9px 9px, linear-gradient(90deg, ${PATTERN_INK} 2px, transparent 2px) 0 0 / 9px 9px`,
};

export function getCoverColorMeta(colorKey, colors = DEFAULT_COVER_COLORS) {
  if (!colorKey) return null;
  return (
    colors.find((c) => c.colorKey === colorKey) ||
    DEFAULT_COLOR_MAP[colorKey] ||
    null
  );
}

export function getCoverHex(cover) {
  if (!cover?.color) return null;
  return cover.hexCode || getCoverColorMeta(cover.color)?.hexCode || null;
}

export function getCoverTextHex(cover) {
  return cover?.textHexCode || getCoverColorMeta(cover?.color)?.textHexCode || '#172B4D';
}

export function hasCover(cover) {
  return !!(cover && (cover.color || cover.imageUrl));
}

export function resolveCoverImageUrl(url) {
  if (!url) return null;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${API_BASE_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Color + (optional) colorblind pattern ko ek CSS background me convert karta hai
export function getCoverBackground(colorKey, hex, colorblind) {
  if (!hex) return undefined;
  const pattern = colorblind ? COLORBLIND_PATTERNS[colorKey] : null;
  return pattern ? `${pattern}, ${hex}` : hex;
}

const COLORBLIND_STORAGE_KEY = 'card_cover_colorblind_mode';
const COLORBLIND_EVENT = 'card-cover-colorblind-change';

function readColorblindMode() {
  try {
    return localStorage.getItem(COLORBLIND_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function useColorblindMode() {
  const [enabled, setEnabled] = useState(readColorblindMode);

  useEffect(() => {
    const sync = () => setEnabled(readColorblindMode());
    window.addEventListener(COLORBLIND_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COLORBLIND_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = (value) => {
    try {
      localStorage.setItem(COLORBLIND_STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* storage blocked - sirf current session me apply hoga */
    }
    setEnabled(value);
    window.dispatchEvent(new Event(COLORBLIND_EVENT));
  };

  return [enabled, update];
}

let coverColorsPromise = null;

export function useCoverColors() {
  const [colors, setColors] = useState(DEFAULT_COVER_COLORS);

  useEffect(() => {
    let mounted = true;
    if (!coverColorsPromise) {
      coverColorsPromise = getCoverColors().catch((err) => {
        console.error('Failed to load cover colors', err);
        coverColorsPromise = null;
        return null;
      });
    }
    coverColorsPromise.then((data) => {
      if (mounted && Array.isArray(data) && data.length > 0) setColors(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return colors;
}
