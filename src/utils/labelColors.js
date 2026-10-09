// Trello ka label palette: 10 color families x 3 shades (subtle / normal / bold) = 30 colors
const FAMILIES = [
  { key: 'green', name: 'green', subtle: '#BAF3DB', normal: '#4BCE97', bold: '#1F845A' },
  { key: 'yellow', name: 'yellow', subtle: '#F8E6A0', normal: '#F5CD47', bold: '#946F00' },
  { key: 'orange', name: 'orange', subtle: '#FEDEC8', normal: '#FEA362', bold: '#C25100' },
  { key: 'red', name: 'red', subtle: '#FFD5D2', normal: '#F87168', bold: '#C9372C' },
  { key: 'purple', name: 'purple', subtle: '#DFD8FD', normal: '#9F8FEF', bold: '#6E5DC6' },
  { key: 'blue', name: 'blue', subtle: '#CCE0FF', normal: '#579DFF', bold: '#0C66E4' },
  { key: 'sky', name: 'sky', subtle: '#C6EDFB', normal: '#6CC3E0', bold: '#227D9B' },
  { key: 'lime', name: 'lime', subtle: '#D3F1A7', normal: '#94C748', bold: '#5B7F24' },
  { key: 'pink', name: 'pink', subtle: '#FDD0EC', normal: '#E774BB', bold: '#AE4787' },
  { key: 'black', name: 'gray', subtle: '#DCDFE4', normal: '#8590A2', bold: '#626F86' },
];

const SHADE_LABEL = { subtle: 'subtle', normal: '', bold: 'bold' };

function buildRow(families, shade) {
  return families.map((f) => ({
    family: f.key,
    hex: f[shade],
    name: `${SHADE_LABEL[shade]} ${f.name}`.trim(),
  }));
}

export const LABEL_COLOR_GRID = [
  ...buildRow(FAMILIES.slice(0, 5), 'subtle'),
  ...buildRow(FAMILIES.slice(0, 5), 'normal'),
  ...buildRow(FAMILIES.slice(0, 5), 'bold'),
  ...buildRow(FAMILIES.slice(5), 'subtle'),
  ...buildRow(FAMILIES.slice(5), 'normal'),
  ...buildRow(FAMILIES.slice(5), 'bold'),
];

export const DEFAULT_LABEL_COLOR = '#4BCE97';

const HEX_TO_FAMILY = Object.fromEntries(
  LABEL_COLOR_GRID.map((c) => [c.hex.toLowerCase(), c.family]),
);

export function getLabelColorFamily(hex) {
  return hex ? HEX_TO_FAMILY[hex.toLowerCase()] || null : null;
}

export function getLabelColorName(hex) {
  if (!hex) return 'none';
  const match = LABEL_COLOR_GRID.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  return match ? match.name : hex;
}

function parseHex(hex) {
  const clean = (hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

export function getLabelTextColor(hex) {
  const rgb = parseHex(hex);
  if (!rgb) return '#172B4D';
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.2 ? '#172B4D' : '#FFFFFF';
}
