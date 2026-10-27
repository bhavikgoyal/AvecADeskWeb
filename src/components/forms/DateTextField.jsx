import { useRef, useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { toIsoDateString } from '../../utils/dateFormat';

const isoToDisplay = (iso) => {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
};

const maskDisplayInput = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const displayToIso = (text) => {
  const match = String(text || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return '';
  const [, day, month, year] = match;
  return toIsoDateString(`${day}-${month}-${year}`);
};

const completePartialDate = (text, currentIso) => {
  const match = String(text || '').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{0,4}))?$/);
  if (!match) return '';
  const [, day, month, year] = match;
  const fallbackYear = String(currentIso || '').slice(0, 4) || String(new Date().getFullYear());
  const fullYear = year && year.length === 4 ? year : fallbackYear;
  return toIsoDateString(`${day.padStart(2, '0')}-${month.padStart(2, '0')}-${fullYear}`);
};

export default function DateTextField({
  value,
  onChangeValue,
  inputProps,
  InputProps,
  slotProps,
  disabled,
  minDate,
  maxDate,
  ...props
}) {
  const isoValue = toIsoDateString(value);
  const minIso = toIsoDateString(minDate) || undefined;
  const maxIso = toIsoDateString(maxDate) || undefined;
  const isInRange = (iso) => (!minIso || iso >= minIso) && (!maxIso || iso <= maxIso);
  const [text, setText] = useState(() => isoToDisplay(isoValue));
  const [syncedIso, setSyncedIso] = useState(isoValue);
  const pickerRef = useRef(null);
  const readOnly = Boolean(InputProps?.readOnly || slotProps?.input?.readOnly);

  if (isoValue !== syncedIso) {
    setSyncedIso(isoValue);
    if (displayToIso(text) !== isoValue) setText(isoToDisplay(isoValue));
  }

  const handleTextChange = (event) => {
    const input = event.target;
    const raw = input.value;
    const masked = maskDisplayInput(raw);
    setText(masked);

   const caret = input.selectionStart ?? raw.length;
    const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, '').length;
    let nextCaret = 0;
    let seen = 0;
    while (nextCaret < masked.length && seen < digitsBeforeCaret) {
      if (/\d/.test(masked[nextCaret])) seen += 1;
      nextCaret += 1;
    }
    requestAnimationFrame(() => {
      if (document.activeElement === input) input.setSelectionRange(nextCaret, nextCaret);
    });

    if (masked === '') {
      onChangeValue?.('');
      return;
    }

    const nextIso = displayToIso(masked);
    if (nextIso && isInRange(nextIso)) onChangeValue?.(nextIso);
  };

  const handleBlur = (event) => {
    const typedIso = displayToIso(text) || completePartialDate(text, isoValue);
    if (text && (!typedIso || !isInRange(typedIso))) {
      setText(isoToDisplay(isoValue));
    } else if (typedIso && typedIso !== isoValue) {
      setText(isoToDisplay(typedIso));
     onChangeValue?.(typedIso);
    }
    props.onBlur?.(event);
  };

  const handlePickerChange = (event) => {
    const next = event.target.value || '';
    if (next && !isInRange(next)) return;
    setText(isoToDisplay(next));
    setSyncedIso(next);
    onChangeValue?.(next);
  };

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;
    if (typeof picker.showPicker === 'function') picker.showPicker();
    else picker.click();
  };

  const endAdornment = (
    <InputAdornment position="end" sx={{ position: 'relative', ml: 0 }}>
      <IconButton
        size="small"
        edge="end"
        onClick={openPicker}
        disabled={disabled || readOnly}
        aria-label="Open calendar"
      >
        <CalendarMonthIcon fontSize="small" />
      </IconButton>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={isoValue}
        min={minIso}
        max={maxIso}
        onChange={handlePickerChange}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          opacity: 0,
          border: 0,
          padding: 0,
          pointerEvents: 'none',
        }}
      />
    </InputAdornment>
  );

  return (
    <TextField
      {...props}
      type="text"
      value={text}
      disabled={disabled}
      onChange={handleTextChange}
      onBlur={handleBlur}
      placeholder="dd/mm/yyyy"
      slotProps={{
        ...slotProps,
        inputLabel: {
          shrink: true,
          ...slotProps?.inputLabel,
        },
        input: {
          ...InputProps,
          ...slotProps?.input,
          endAdornment,
        },
        htmlInput: {
          inputMode: 'numeric',
          maxLength: 10,
          ...inputProps,
          ...slotProps?.htmlInput,
        },
      }}
    />
  );
}
