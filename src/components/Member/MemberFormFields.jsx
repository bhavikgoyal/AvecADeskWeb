import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import FormSection, { FormGridItem } from '../forms/FormSection';
import { compactFieldGrid, formFieldSx } from '../forms/formStyles';

const fieldProps = { size: 'small', fullWidth: true, sx: formFieldSx };

function MemberTextField({ name, label, value, onChange, error, required, type = 'text', inputProps }) {
  return (
    <FormGridItem size={compactFieldGrid}>
      <TextField
        {...fieldProps}
        name={name}
        label={label}
        required={required}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        error={Boolean(error)}
        helperText={error || ' '}
        inputProps={inputProps}
        FormHelperTextProps={{ sx: { minHeight: 20, m: 0, mt: 0.5 } }}
      />
    </FormGridItem>
  );
}

function MemberSelectField({ name, label, value, onChange, error, required, options, placeholder }) {
  const labelId = `${name}-label`;

  return (
    <FormGridItem size={compactFieldGrid}>
      <FormControl {...fieldProps} error={Boolean(error)} required={required}>
        <InputLabel id={labelId} shrink>
          {label}
        </InputLabel>
        <Select
          labelId={labelId}
          name={name}
          label={label}
          value={value ?? ''}
          onChange={onChange}
          displayEmpty
          renderValue={(selected) => {
            if (!selected) {
              return (
                <Box component="span" sx={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                  {placeholder}
                </Box>
              );
            }
            return options.find((option) => String(option.value) === String(selected))?.label || selected;
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={String(option.value)}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
        <FormHelperText sx={{ minHeight: 20, m: 0, mt: 0.5 }}>{error || ' '}</FormHelperText>
      </FormControl>
    </FormGridItem>
  );
}

export default function MemberFormFields({
  form,
  errors = {},
  companies = [],
  roles = [],
  onChange,
  onPhoneChange,
  onImageChange,
  showAvatar = false,
  userId,
  userName,
}) {
  const companyOptions = companies.map((company) => ({
    value: company.id,
    label: company.name,
  }));

  const roleOptions = roles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

  return (
    <Grid container spacing={{ xs: 1.25, md: 1.5 }} sx={{ width: '100%', m: 0, alignItems: 'stretch' }}>
      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
        <FormSection title="Account details" description="Login credentials and access status." divider={false} fill>
          <MemberTextField
            name="userName"
            label="Username"
            value={form.userName}
            onChange={onChange}
            error={errors.userName}
            required
          />
          <MemberTextField
            name="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={onChange}
            error={errors.email}
            required
          />
          <FormGridItem size={compactFieldGrid}>
            <FormControlLabel
              control={
                <Checkbox
                  name="isActive"
                  checked={Boolean(form.isActive)}
                  onChange={onChange}
                  sx={{ color: 'var(--primary)', '&.Mui-checked': { color: 'var(--primary)' } }}
                />
              }
              label="Is active"
              sx={{ ml: 0, mt: 0.5, '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.875rem' } }}
            />
          </FormGridItem>
        </FormSection>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
        <FormSection title="Personal info" description="Member name and contact details." divider={false} fill>
          <MemberTextField
            name="firstName"
            label="First name"
            value={form.firstName}
            onChange={onChange}
            error={errors.firstName}
            required
          />
          <MemberTextField
            name="lastName"
            label="Last name"
            value={form.lastName}
            onChange={onChange}
            error={errors.lastName}
            required
          />
          <FormGridItem size={compactFieldGrid}>
            <TextField
              {...fieldProps}
              name="phoneNo"
              label="Phone"
              value={form.phoneNo ?? ''}
              onChange={onPhoneChange}
              error={Boolean(errors.phoneNo)}
              helperText={errors.phoneNo || ' '}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              FormHelperTextProps={{ sx: { minHeight: 20, m: 0, mt: 0.5 } }}
            />
          </FormGridItem>
        </FormSection>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
        <FormSection title="Organization" description="Company and role assignment." divider={false} fill>
          <MemberSelectField
            name="companiesId"
            label="Company"
            value={form.companiesId}
            onChange={onChange}
            error={errors.companiesId}
            required
            options={companyOptions}
            placeholder="Select company"
          />
          <MemberSelectField
            name="userRoleId"
            label="Role"
            value={form.userRoleId}
            onChange={onChange}
            error={errors.userRoleId}
            required
            options={roleOptions}
            placeholder="Select role"
          />
        </FormSection>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex', minWidth: 0 }}>
        <FormSection title="Profile" description="Profile image upload and preview." divider={false} fill>
          <FormGridItem size={compactFieldGrid}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', mb: 0.75 }}>
              Profile image
            </Typography>
            <Box
              component="input"
              type="file"
              accept="image/*"
              onChange={onImageChange}
              sx={{
                display: 'block',
                width: '100%',
                fontSize: '0.875rem',
                color: 'var(--text)',
                '&::file-selector-button': {
                  mr: 1.5,
                  border: '1px solid var(--card-border)',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.75,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  bgcolor: '#fff',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'var(--primary)', bgcolor: 'var(--primary-soft)' },
                },
              }}
            />
          </FormGridItem>

          {showAvatar && (
            <FormGridItem size={compactFieldGrid}>
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', mb: 0.75 }}>
                Current image
              </Typography>
              <Box
                component="img"
                src={form.avatarBase64 || `/images/${userName}.png`}
                alt="Avatar"
                onError={(event) => {
                  event.target.onerror = null;
                  event.target.src = `https://i.pravatar.cc/100?u=${userId}`;
                }}
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid var(--card-border)',
                }}
              />
            </FormGridItem>
          )}
        </FormSection>
      </Grid>
    </Grid>
  );
}
