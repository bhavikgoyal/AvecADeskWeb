import Popover from '@mui/material/Popover';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { BRAND, SUBTLE_TEXT, TEXT, getAvatarColor, getInitials } from './cardModalStyles';

export function CardPopover({ open, anchorEl, anchorPosition, onClose, width = 304, children }) {
  return (
    <Popover
      open={open && (!!anchorPosition || !!anchorEl)}
      anchorEl={anchorPosition ? null : anchorEl}
      anchorReference={anchorPosition ? 'anchorPosition' : 'anchorEl'}
      anchorPosition={anchorPosition}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            width,
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100vh - 80px)',
            borderRadius: '8px',
            boxShadow: '0 8px 12px #091E4226, 0 0 1px #091E424F',
            padding: '12px',
            boxSizing: 'border-box',
            color: TEXT,
          },
        },
      }}
    >
      {children}
    </Popover>
  );
}

export function PopoverHeader({ title, onClose, onBack }) {
  const iconBtn = {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: SUBTLE_TEXT,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };
  return (
    <div
      style={{
        position: 'relative',
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
      }}
    >
      {onBack && (
        <button type="button" aria-label="Back" onClick={onBack} style={{ ...iconBtn, left: 0 }}>
          <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
        </button>
      )}
      <span style={{ fontSize: 14, fontWeight: 600, color: SUBTLE_TEXT }}>{title}</span>
      <button type="button" aria-label="Close" onClick={onClose} style={{ ...iconBtn, right: 0 }}>
        <CloseIcon sx={{ fontSize: 18 }} />
      </button>
    </div>
  );
}

export function Avatar({ name, size = 32, title, onClick, style }) {
  return (
    <div
      title={title ?? name}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: getAvatarColor(name),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size <= 24 ? 10 : 12,
        fontWeight: 700,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?:^|(?<=\s))@[\w.-]+)/g;

export function LinkifiedText({ text }) {
  if (!text) return null;
  const parts = text.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (index % 2 === 1 && part.startsWith('@')) {
      return (
        <span
          key={index}
          style={{ padding: '0 2px', borderRadius: 3, background: '#E9F2FF', color: BRAND, fontWeight: 600 }}
        >
          {part}
        </span>
      );
    }
    if (index % 2 === 1) {
      const href = part.includes('@') && !part.startsWith('http') ? `mailto:${part}` : part;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: BRAND, textDecoration: 'underline', wordBreak: 'break-all' }}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}
