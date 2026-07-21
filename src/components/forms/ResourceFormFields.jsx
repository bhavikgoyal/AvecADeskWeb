import { Fragment, useState, useEffect } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const defaultEditorConfig = {
  toolbar: {
    items: [
      'undo', 'redo', '|', 'heading', '|', 'bold', 'italic', 'underline',
      '|', 'link', '|', 'bulletedList', 'numberedList', 'outdent', 'indent',
      '|', 'insertTable', 'blockQuote', 'codeBlock', '|', 'imageUpload', 'mediaEmbed', '|', 'removeFormat'
    ],
    shouldNotGroupWhenFull: true
  },
  image: {
    toolbar: ['imageTextAlternative', 'imageStyle:full', 'imageStyle:side']
  },
  extraPlugins: [function MyCustomUploadAdapterPlugin(editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      return {
        upload() {
          return loader.file.then(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ default: reader.result });
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
          }));
        },
        abort() {
          // no-op for base64
        }
      };
    };
  }]
};
import { Box,Button, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField,Typography } from '@mui/material';
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
  disabledFields = [],
  compact = false,
  stretch = false,
  selectOptions = {},
  requiredFields = [],
}) {
  const handleChange = (field) => (event) => {
    onChange(field, event.target.value);
  };

  const textareaRows = stretch ? 5 : 3;

  const renderField = (fieldName) => {
    const def = FIELD_DEFS[fieldName];
    if (!def) return null;
    const isRequired = Boolean(def.required) || requiredFields.includes(fieldName);
    const isDate = def.type === 'date';
    const isFieldDisabled = disabled || def.readOnly || disabledFields.includes(fieldName);
      if (def.type === "file") {
      const preview =
        form[fieldName] && typeof form[fieldName] === "string"
          ? `${import.meta.env.VITE_API_BASE_URL}${form[fieldName].replace(/^wwwroot/, "")}`
          : form[fieldName] instanceof File
          ? URL.createObjectURL(form[fieldName])
          : null;

      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <Box sx={{ width: "100%" }}>
            <Typography
              component="label"
              sx={{ display: "block", mb: 0.5, color: "var(--text)", fontSize: "0.75rem", fontWeight: 500 }}
            >
              {def.label}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ flexShrink: 0 }}>
                <input
                  type="file"
                  accept={def.accept || "image/*"}
                  disabled={isFieldDisabled}
                  style={{ width: "auto", maxWidth: "220px" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onChange(fieldName, file);
                  }}
                />
              </Box>

              {preview && (
                <Box
                  component="img"
                  src={preview}
                  alt="Preview"
                  sx={{ width: 80, height: 80, objectFit: "contain", border: "1px solid #ddd", borderRadius: 1, flexShrink: 0 }}
                />
              )}
            </Box>
          </Box>
        </FormGridItem>
      );
    }
    if (def.type === 'editor') {
      const [isSource, setIsSource] = useState(false);
      const [localData, setLocalData] = useState(form[fieldName] || '');

      useEffect(() => {
        setLocalData(form[fieldName] || '');
      }, [form[fieldName]]);

      const toggleSource = () => setIsSource((s) => !s);

      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography component="label" sx={{ color: 'var(--text)', fontSize: '0.75rem', fontWeight: 500 }}>{def.label}</Typography>
            <Button size="small" onClick={toggleSource} disabled={isFieldDisabled}>
              {isSource ? 'Editor' : 'HTML Source'}
            </Button>
          </Box>
          {isSource ? (
            <TextField
              {...fieldProps}
              multiline
              minRows={6}
              value={localData}
              onChange={(e) => {
                setLocalData(e.target.value);
                onChange(fieldName, e.target.value);
              }}
              disabled={isFieldDisabled}
            />
          ) : (
            <CKEditor
              editor={ClassicEditor}
              data={localData}
              config={defaultEditorConfig}
              disabled={isFieldDisabled}
              onReady={() => {}}
              onChange={(_, editor) => {
                const data = editor.getData();
                setLocalData(data);
                onChange(fieldName, data);
              }}
            />
          )}
        </FormGridItem>
      );
    }

    if (def.type === 'select' || def.type === 'api-select') {
      const options = def.type === 'api-select' ? selectOptions[fieldName] || [] : def.options.map((option) => ({ value: option, label: option }));
      const labelId = `${fieldName}-label`;
      const currentValue = form[fieldName] || '';
      const selectedLabel = options.find((option) => String(option.value) === String(currentValue))?.label;

      return (
        <FormGridItem key={fieldName} size={resolveFieldGrid(def, compact)}>
          <FormControl {...fieldProps} disabled={isFieldDisabled || (def.type === 'api-select' && options.length === 0)}>
            <InputLabel id={labelId} shrink required={isRequired}>
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
                          ? `No ${def.label.toLowerCase()} available `
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
                disabled={isFieldDisabled}
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
          required={isRequired}
          type={def.type === 'textarea' ? undefined : def.type}
          multiline={def.type === 'textarea'}
          minRows={def.type === 'textarea' ? textareaRows : undefined}
          value={form[fieldName] ?? ''}
          onChange={handleChange(fieldName)}
          disabled={isFieldDisabled}
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
