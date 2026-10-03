export const TEXT = '#172B4D';
export const SUBTLE_TEXT = '#44546F';
export const MUTED_TEXT = '#626F86';
export const BORDER = '#091E4224';
export const NEUTRAL_BG = '#091E420F';
export const BRAND = '#0C66E4';

export const actionButtonStyle = {
  height: 32,
  padding: '0 12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: `1px solid ${BORDER}`,
  borderRadius: 4,
  background: '#fff',
  color: SUBTLE_TEXT,
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};

export const greyButtonStyle = {
  height: 32,
  padding: '0 12px',
  border: 'none',
  borderRadius: 4,
  background: NEUTRAL_BG,
  color: TEXT,
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export const primaryButtonStyle = {
  ...greyButtonStyle,
  background: BRAND,
  color: '#fff',
};

export const dangerButtonStyle = {
  ...greyButtonStyle,
  background: '#C9372C',
  color: '#fff',
};

export const inputStyle = {
  width: '100%',
  height: 36,
  padding: '0 10px',
  border: `1px solid #8590A2`,
  borderRadius: 4,
  fontSize: 14,
  color: TEXT,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
  background: '#fff',
};

export const popoverSectionTitle = {
  margin: '16px 0 8px',
  fontSize: 12,
  fontWeight: 700,
  color: SUBTLE_TEXT,
};

const AVATAR_COLORS = ['#5E4DB2', '#1F845A', '#C25100', '#0C66E4', '#AE4787', '#227D9B', '#946F00', '#C9372C'];

export function getInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getAvatarColor(name) {
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function formatTrelloDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
