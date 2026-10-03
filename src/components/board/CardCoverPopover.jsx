import { useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import {
  getCoverBackground,
  getCoverHex,
  hasCover,
  resolveCoverImageUrl,
  useColorblindMode,
  useCoverColors,
} from '../../utils/cardCover';

const sectionTitleStyle = {
  margin: '16px 0 8px',
  fontSize: 12,
  fontWeight: 700,
  color: '#44546F',
};

const greyButtonStyle = {
  width: '100%',
  height: 32,
  border: 'none',
  borderRadius: 4,
  background: '#091E420F',
  color: '#172B4D',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  cursor: 'pointer',
};

function SkeletonLines({ light }) {
  const bar = light ? 'rgba(255,255,255,0.85)' : '#DCDFE4';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ height: 4, width: '80%', borderRadius: 2, background: bar }} />
      <span style={{ height: 4, width: '62%', borderRadius: 2, background: bar }} />
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
        <span style={{ height: 4, width: 16, borderRadius: 2, background: bar }} />
        <span style={{ height: 4, width: 16, borderRadius: 2, background: bar }} />
        <span style={{ flex: 1 }} />
        <span style={{ height: 10, width: 10, borderRadius: '50%', background: bar }} />
      </div>
    </div>
  );
}

function SizeTile({ selected, disabled, onClick, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1,
        height: 62,
        padding: 0,
        borderRadius: 4,
        border: 'none',
        boxShadow: selected
          ? '0 0 0 2px #0C66E4'
          : '0 0 0 1px #091E4224',
        background: '#fff',
        overflow: 'hidden',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </button>
  );
}

export default function CardCoverPopover({
  cover,
  saving,
  onSave,
  onRemove,
  onUpload,
  onClose,
  style,
}) {
  const colors = useCoverColors();
  const [colorblind, setColorblind] = useColorblindMode();
  const fileInputRef = useRef(null);

  const active = hasCover(cover);
  const size = cover?.size || 'normal';
  const hex = getCoverHex(cover);
  const imageUrl = resolveCoverImageUrl(cover?.imageUrl);
  const previewBackground = imageUrl
    ? `center / cover no-repeat url("${imageUrl}")`
    : getCoverBackground(cover?.color, hex, colorblind) || '#DCDFE4';

  const handleSelectColor = (colorKey) => {
    onSave({
      color: colorKey,
      imageUrl: null,
      size,
      brightness: 'light',
    });
  };

  const handleSelectSize = (nextSize) => {
    if (!active || nextSize === size) return;
    onSave({
      color: cover.color ?? null,
      imageUrl: cover.imageUrl ?? null,
      size: nextSize,
      brightness: cover.brightness || 'light',
    });
  };

  const handleSelectBrightness = (brightness) => {
    if (!cover?.imageUrl || brightness === cover.brightness) return;
    onSave({
      color: null,
      imageUrl: cover.imageUrl,
      size,
      brightness,
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onUpload(file);
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        width: 304,
        maxHeight: '70vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 8px 12px #091E4226, 0 0 1px #091E424F',
        padding: '12px',
        boxSizing: 'border-box',
        zIndex: 60,
        color: '#172B4D',
        textAlign: 'left',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 32,
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#44546F' }}>Cover</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cover popover"
          style={{
            position: 'absolute',
            right: 0,
            width: 32,
            height: 32,
            border: 'none',
            borderRadius: 4,
            background: 'transparent',
            color: '#44546F',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      <p style={{ ...sectionTitleStyle, marginTop: 4 }}>Size</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <SizeTile
          label="Normal cover"
          selected={active && size === 'normal'}
          disabled={!active || saving}
          onClick={() => handleSelectSize('normal')}
        >
          <div style={{ height: 26, background: previewBackground }} />
          <div style={{ flex: 1, padding: '5px 8px' }}>
            <SkeletonLines />
          </div>
        </SizeTile>

        <SizeTile
          label="Full cover"
          selected={active && size === 'full'}
          disabled={!active || saving}
          onClick={() => handleSelectSize('full')}
        >
          <div
            style={{
              flex: 1,
              background: previewBackground,
              display: 'flex',
              alignItems: 'flex-end',
              padding: '6px 8px',
            }}
          >
            <div style={{ width: '100%' }}>
              <span
                style={{
                  display: 'block',
                  height: 4,
                  width: '80%',
                  borderRadius: 2,
                  background: imageUrl ? 'rgba(255,255,255,0.9)' : '#172B4D',
                  marginBottom: 4,
                }}
              />
              <span
                style={{
                  display: 'block',
                  height: 4,
                  width: '55%',
                  borderRadius: 2,
                  background: imageUrl ? 'rgba(255,255,255,0.9)' : '#172B4D',
                }}
              />
            </div>
          </div>
        </SizeTile>
      </div>

      {active && (
        <button
          type="button"
          disabled={saving}
          onClick={onRemove}
          style={{ ...greyButtonStyle, marginTop: 8 }}
        >
          Remove cover
        </button>
      )}

      {cover?.imageUrl && size === 'full' && (
        <>
          <p style={sectionTitleStyle}>Text color</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { key: 'dark', label: 'White text', text: '#fff', overlay: 'linear-gradient(transparent, rgba(0,0,0,0.65))' },
              { key: 'light', label: 'Black text', text: '#172B4D', overlay: 'linear-gradient(transparent, rgba(255,255,255,0.85))' },
            ].map((opt) => (
              <SizeTile
                key={opt.key}
                label={opt.label}
                selected={(cover.brightness || 'dark') === opt.key}
                disabled={saving}
                onClick={() => handleSelectBrightness(opt.key)}
              >
                <div
                  style={{
                    flex: 1,
                    background: `${opt.overlay}, center / cover no-repeat url("${imageUrl}")`,
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '6px 8px',
                    color: opt.text,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {opt.label}
                </div>
              </SizeTile>
            ))}
          </div>
        </>
      )}

      <p style={sectionTitleStyle}>Colors</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}
      >
        {colors.map((c) => {
          const selected = !cover?.imageUrl && cover?.color === c.colorKey;
          return (
            <button
              key={c.colorKey}
              type="button"
              title={c.colorName}
              aria-label={c.colorName}
              aria-pressed={selected}
              disabled={saving}
              onClick={() => handleSelectColor(c.colorKey)}
              style={{
                height: 32,
                border: 'none',
                borderRadius: 4,
                background: getCoverBackground(c.colorKey, c.hexCode, colorblind),
                cursor: saving ? 'wait' : 'pointer',
                boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px #0C66E4' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              {selected && (
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckIcon sx={{ fontSize: 14, color: '#172B4D' }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setColorblind(!colorblind)}
        style={{ ...greyButtonStyle, marginTop: 12 }}
      >
        {colorblind ? 'Disable colorblind friendly mode' : 'Enable colorblind friendly mode'}
      </button>

      <p style={sectionTitleStyle}>Attachments</p>
      {cover?.imageUrl && (
        <div
          style={{
            height: 48,
            width: 88,
            marginBottom: 8,
            borderRadius: 4,
            background: `center / cover no-repeat url("${imageUrl}")`,
            boxShadow: '0 0 0 2px #fff, 0 0 0 4px #0C66E4',
          }}
          title="Current cover image"
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => fileInputRef.current?.click()}
        style={greyButtonStyle}
      >
        {saving ? 'Saving...' : 'Upload a cover image'}
      </button>
      <p style={{ margin: '8px 0 0', fontSize: 12, color: '#44546F' }}>
        Tip: Drag an image on to the card to upload it.
      </p>
    </div>
  );
}
