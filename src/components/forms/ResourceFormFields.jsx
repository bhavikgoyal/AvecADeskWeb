import { Fragment } from 'react';
import { FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { FIELD_DEFS } from '../../config/resourceConfig';
import { FormGridItem } from './FormSection';
import { compactFieldGrid, defaultFieldGrid, formFieldSx } from './formStyles';

const fieldProps = { size: 'small', fullWidth: true, sx: formFieldSx };

function resolveFieldGrid(def, compact) {
  if (compact) {
    if (def.type === 'textarea') return { xs: 12 };
    if (def.grid?.xs === 12 && !def.grid?.md) return { xs: 12 };
    return compactFieldGrid;
  }
  return def.grid || defaultFieldGrid;
}

const dateFieldProps = {
  InputLabelProps: { shrink: true },
  slotProps: {
    inputLabel: { shrink: true },
    htmlInput: { placeholder: '' },
  },
};

export default function ResourceFormFields({
  sections,
  form,
  onChange,
  disabled = false,
  compact = false,
  stretch = false,
}) {
  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

  const textareaRows = stretch ? 5 : 3;

  const renderField = (fieldName) => {
    const def = FIELD_DEFS[fieldName];
    if (!def) return null;
    const isDate = def.type === 'date';

    if (def.type === 'select') {
      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <FormControl {...fieldProps} disabled={disabled}>
            <InputLabel>{def.label}</InputLabel>
            <Select label={def.label} value={form[fieldName] || ''} onChange={handleChange(fieldName)}>
              {def.options.map((option) => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </FormGridItem>
      );
    }

    return (
      <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
        <TextField
          {...fieldProps}
          {...(isDate ? dateFieldProps : {})}
          label={def.label}
          required={def.required}
          type={def.type === 'textarea' ? undefined : def.type}
          multiline={def.type === 'textarea'}
          minRows={def.type === 'textarea' ? textareaRows : undefined}
          value={form[fieldName] ?? ''}
          onChange={handleChange(fieldName)}
          disabled={disabled}
        />
      </FormGridItem>
    );
  };

  return sections.map((section) => (
    <Fragment key={section.title}>
      {section.fields.map((fieldName) => renderField(fieldName))}
    </Fragment>
  ));
}
