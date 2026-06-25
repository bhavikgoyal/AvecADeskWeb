import { Fragment } from 'react';
import { Box, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from '@mui/material';
import { FIELD_DEFS } from '../../config/resourceConfig';
import { FormGridItem } from './FormSection';
import { compactFieldGrid, defaultFieldGrid, formFieldSx } from './formStyles';

const fieldProps = { size: 'small', fullWidth: true, sx: formFieldSx };

function resolveFieldGrid(def, compact) {
  if (def.type === 'textarea') {
    return { xs: 12 };
  }
  if (def.type === 'checkbox') {
    return compact ? { xs: 12 } : (def.grid || { xs: 12 });
  }
  if (compact) {
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
  selectOptions = {},
}) {
  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

  const textareaRows = stretch ? 5 : 3;

  const renderField = (fieldName) => {
    const def = FIELD_DEFS[fieldName];
    if (!def) return null;
    const isDate = def.type === 'date';

    if (def.type === 'select' || def.type === 'api-select') {
      const options = def.type === 'api-select' ? selectOptions[fieldName] || [] : def.options.map((option) => ({ value: option, label: option }));
      const labelId = `${fieldName}-label`;
      const currentValue = form[fieldName] || '';
      const selectedLabel = options.find((option) => String(option.value) === String(currentValue))?.label;

      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <FormControl {...fieldProps} disabled={disabled || (def.type === 'api-select' && options.length === 0)}>
            <InputLabel id={labelId} shrink required={def.required}>
              {def.label}
            </InputLabel>
            <Select
              labelId={labelId}
              label={def.label}
              value={currentValue}
              onChange={handleChange(fieldName)}
              displayEmpty={def.type === 'api-select'}
              renderValue={
                def.type === 'api-select'
                  ? (selected) => {
                      if (!selected) {
                        const placeholder = options.length === 0
                          ? `Loading ${def.label.toLowerCase()}...`
                          : `Select ${def.label.toLowerCase()}`;
                        return (
                          <Box component="span" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                            {placeholder}
                          </Box>
                        );
                      }
                      return selectedLabel || selected;
                    }
                  : undefined
              }
            >
              {options.map((option) => (
                <MenuItem key={option.value} value={String(option.value)}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </FormGridItem>
      );
    }

    if (def.type === 'checkbox') {
      const checked = form[fieldName] === true || form[fieldName] === 'Yes';
      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <FormControlLabel
            control={
              <Checkbox
                checked={checked}
                onChange={(event) => onChange(fieldName, event.target.checked ? 'Yes' : 'No')}
                disabled={disabled}
                sx={{ color: 'var(--primary)', '&.Mui-checked': { color: 'var(--primary)' } }}
              />
            }
            label={def.label}
            sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.875rem' } }}
          />
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
