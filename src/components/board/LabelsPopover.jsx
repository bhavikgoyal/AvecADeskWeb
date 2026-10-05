import { useState } from 'react';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import {
  DEFAULT_LABEL_COLOR,
  LABEL_COLOR_GRID,
  getLabelColorFamily,
  getLabelColorName,
  getLabelTextColor,
} from '../../utils/labelColors';
import { getCoverBackground, useColorblindMode } from '../../utils/cardCover';
import {
  BORDER,
  BRAND,
  SUBTLE_TEXT,
  TEXT,
  dangerButtonStyle,
  greyButtonStyle,
  inputStyle,
  popoverSectionTitle,
  primaryButtonStyle,
} from './cardModalStyles';
import { PopoverHeader } from './cardModalUi';

const COLLAPSED_COUNT = 6;

export function LabelChip({ label, colorblind, height = 32, onClick, style, title }) {
  const color = label.color || '';
  const textColor = color ? getLabelTextColor(color) : SUBTLE_TEXT;
  return (
    <div
      onClick={onClick}
      title={title ?? (label.labelName || `Color: ${getLabelColorName(color)}`)}
      style={{
        height,
        minWidth: 48,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 4,
        background: color
          ? getCoverBackground(getLabelColorFamily(color), color, colorblind)
          : '#fff',
        border: color ? 'none' : `1px dashed #8590A2`,
        color: textColor,
        fontSize: 14,
        fontWeight: 500,
        boxSizing: 'border-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {label.labelName}
    </div>
  );
}

function Checkbox({ checked }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 3,
        border: checked ? 'none' : '2px solid #8590A2',
        background: checked ? BRAND : '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {checked && <CheckIcon sx={{ fontSize: 13, color: '#fff' }} />}
    </span>
  );
}

function LabelEditor({
  mode,
  initial,
  existingLabels = [],
  saving,
  colorblind,
  onBack,
  onClose,
  onSubmit,
  onRequestDelete,
}) {
  const [name, setName] = useState(initial?.labelName ?? '');
  const [color, setColor] = useState(initial ? initial.color || '' : DEFAULT_LABEL_COLOR);
  const normalizedName = name.trim().toLowerCase();
  const isDuplicateName =
    normalizedName !== '' &&
    existingLabels.some(
      (l) =>
        l.boardLabelID !== initial?.boardLabelID &&
        (l.labelName || '').trim().toLowerCase() === normalizedName,
    );
  const canSave = !saving && !isDuplicateName && (name.trim() !== '' || color !== '');

  return (
    <div>
      <PopoverHeader
        title={mode === 'edit' ? 'Edit label' : 'Create label'}
        onBack={onBack}
        onClose={onClose}
      />

      <div
        style={{
          margin: '0 -12px',
          padding: '32px 24px',
          background: '#F7F8F9',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <LabelChip
          label={{ labelName: name.trim(), color }}
          colorblind={colorblind}
          style={{ maxWidth: '100%', minWidth: 120 }}
        />
      </div>

      <p style={popoverSectionTitle}>Title</p>
      <input
        autoFocus
        value={name}
        maxLength={200}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSave) onSubmit({ labelName: name.trim(), color });
        }}
        aria-invalid={isDuplicateName}
        style={isDuplicateName ? { ...inputStyle, borderColor: '#C9372C' } : inputStyle}
      />
      {isDuplicateName && (
        <p role="alert" style={{ margin: '4px 0 0', fontSize: 12, color: '#C9372C' }}>
          A label named &quot;{name.trim()}&quot; already exists on this board.
        </p>
      )}

      <p style={popoverSectionTitle}>Select a color</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
        {LABEL_COLOR_GRID.map((c) => {
          const selected = color.toLowerCase() === c.hex.toLowerCase();
          return (
            <button
              key={c.hex}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={selected}
              onClick={() => setColor(c.hex)}
              style={{
                height: 32,
                border: 'none',
                borderRadius: 4,
                padding: 0,
                cursor: 'pointer',
                background: getCoverBackground(c.family, c.hex, colorblind),
                boxShadow: selected ? `0 0 0 2px #fff, 0 0 0 4px ${BRAND}` : 'none',
              }}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setColor('')}
        disabled={color === ''}
        style={{
          ...greyButtonStyle,
          width: '100%',
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: color === '' ? 0.5 : 1,
          cursor: color === '' ? 'not-allowed' : 'pointer',
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} /> Remove color
      </button>

      <div
        style={{
          borderTop: `1px solid ${BORDER}`,
          margin: '12px -12px 0',
          padding: '12px 12px 0',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSubmit({ labelName: name.trim(), color })}
          style={{ ...primaryButtonStyle, opacity: canSave ? 1 : 0.5, cursor: canSave ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Saving...' : mode === 'edit' ? 'Save' : 'Create'}
        </button>
        {mode === 'edit' && (
          <button type="button" disabled={saving} onClick={onRequestDelete} style={dangerButtonStyle}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export default function LabelsPopover({
  labels,
  loading,
  saving,
  onToggle,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}) {
  const [colorblind, setColorblind] = useColorblindMode();
  const [view, setView] = useState({ name: 'list', label: null });
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);

  const backToList = () => setView({ name: 'list', label: null });

  if (view.name === 'create' || view.name === 'edit') {
    return (
      <LabelEditor
        key={`${view.name}-${view.label?.boardLabelID ?? 'new'}`}
        mode={view.name}
        initial={view.label}
        existingLabels={labels}
        saving={saving}
        colorblind={colorblind}
        onBack={backToList}
        onClose={onClose}
        onRequestDelete={() => setView({ name: 'confirmDelete', label: view.label })}
        onSubmit={async (values) => {
          const ok = view.name === 'edit'
            ? await onUpdate(view.label.boardLabelID, values)
            : await onCreate(values);
          if (ok !== false) backToList();
        }}
      />
    );
  }

  if (view.name === 'confirmDelete') {
    return (
      <div>
        <PopoverHeader
          title="Delete label"
          onBack={() => setView({ name: 'edit', label: view.label })}
          onClose={onClose}
        />
        <p style={{ margin: '0 0 12px', fontSize: 14, color: TEXT, lineHeight: '20px' }}>
          This will remove this label from all cards. There is no undo.
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            const ok = await onDelete(view.label.boardLabelID);
            if (ok !== false) backToList();
          }}
          style={{ ...dangerButtonStyle, width: '100%' }}
        >
          {saving ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    );
  }

  const term = search.trim().toLowerCase();
  const filtered = term
    ? labels.filter(
        (l) =>
          (l.labelName || '').toLowerCase().includes(term) ||
          getLabelColorName(l.color).toLowerCase().includes(term),
      )
    : labels;
  const visible = term || showAll ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div>
      <PopoverHeader title="Labels" onClose={onClose} />

      <input
        autoFocus
        placeholder="Search labels..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={inputStyle}
      />

      <p style={popoverSectionTitle}>Labels</p>

      {loading && labels.length === 0 ? (
        <p style={{ margin: '4px 0 8px', fontSize: 13, color: SUBTLE_TEXT }}>Loading labels...</p>
      ) : visible.length === 0 ? (
        <p style={{ margin: '4px 0 8px', fontSize: 13, color: SUBTLE_TEXT }}>
          {term ? 'No labels found.' : 'No labels on this board yet.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visible.map((label) => (
            <div key={label.boardLabelID} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <label
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 4px',
                  cursor: saving ? 'wait' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!label.isAssigned}
                  disabled={saving}
                  onChange={(e) => onToggle(label, e.target.checked)}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                />
                <Checkbox checked={!!label.isAssigned} />
                <LabelChip label={label} colorblind={colorblind} style={{ flex: 1, minWidth: 0 }} />
              </label>
              <button
                type="button"
                aria-label={`Edit label ${label.labelName}`}
                title="Edit label"
                onClick={() => setView({ name: 'edit', label })}
                style={{
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
                  flexShrink: 0,
                }}
              >
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setView({ name: 'create', label: null })}
        style={{ ...greyButtonStyle, width: '100%', marginTop: 12 }}
      >
        Create a new label
      </button>

      {!term && (hiddenCount > 0 || showAll) && filtered.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{ ...greyButtonStyle, width: '100%', marginTop: 8 }}
        >
          {showAll ? 'Show fewer labels' : 'Show more labels'}
        </button>
      )}

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '12px -12px 0', padding: '12px 12px 0' }}>
        <button
          type="button"
          onClick={() => setColorblind(!colorblind)}
          style={{ ...greyButtonStyle, width: '100%' }}
        >
          {colorblind ? 'Disable colorblind friendly mode' : 'Enable colorblind friendly mode'}
        </button>
      </div>
    </div>
  );
}
