import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Session } from '../../utils/session';
import { createMember, getRoles, getCompanies } from '../../api/membersApi';
import {
  FormActions,
  FormGridItem,
  FormPageLayout,
  FormSection,
  formFieldSx,
  formPaperSx,
  selectMenuProps,
} from '../forms';

export default function MembersCreate() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNo: '',
    password: '',
    userRoleId: '',
    companiesId: '',
    isActive: true,
    avatarBase64: '',
  });

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [rolesData, companiesData] = await Promise.all([getRoles(), getCompanies()]);
        setRoles(rolesData || []);
        setCompanies(companiesData || []);
      } catch (err) {
        alert('Failed to load roles / companies: ' + err.message);
      }
    };
    loadLookups();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.userName.trim()) newErrors.userName = 'Username is required';
    else if (form.userName.length < 3) newErrors.userName = 'Username must be at least 3 characters';
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.companiesId) newErrors.companiesId = 'Please select a company';
    if (!form.userRoleId) newErrors.userRoleId = 'Please select a role';
    if (form.phoneNo && !/^\d{10}$/.test(form.phoneNo)) newErrors.phoneNo = 'Phone number must be exactly 10 digits';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, avatarBase64: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const token = Session.getToken();
      if (!token) {
        alert('You are not logged in.');
        return;
      }

      setSaving(true);
      await createMember(form);
      toast.success('Member created successfully', { hideProgressBar: true });
      setTimeout(() => { navigate('/Members'); }, 1500);
    } catch (res) {
      if (res.status === 409) {
        const data = await res.json();
        setErrors({ userName: data.message || 'Username already exists' });
        return;
      }
      setServerError(`Failed to create member: ${await res.text()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPageLayout title="Add Member">
      {serverError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {serverError}
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <FormSection title="Account details" description="Login credentials and access status." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="userName"
              label="Username"
              value={form.userName}
              onChange={handleChange}
              error={Boolean(errors.userName)}
              helperText={errors.userName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="email"
              type="email"
              label="Email"
              value={form.email}
              onChange={handleChange}
              error={Boolean(errors.email)}
              helperText={errors.email || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  sx={{ color: 'var(--primary)', '&.Mui-checked': { color: 'var(--primary)' } }}
                />
              }
              label="Is active"
              sx={{ ml: 0, '& .MuiFormControlLabel-label': { fontWeight: 600, fontSize: '0.875rem' } }}
            />
          </FormGridItem>
        </FormSection>

        <FormSection title="Personal info" description="Member name and contact details." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="firstName"
              label="First name"
              value={form.firstName}
              onChange={handleChange}
              error={Boolean(errors.firstName)}
              helperText={errors.firstName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="lastName"
              label="Last name"
              value={form.lastName}
              onChange={handleChange}
              error={Boolean(errors.lastName)}
              helperText={errors.lastName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              name="phoneNo"
              label="Phone"
              value={form.phoneNo}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm((prev) => ({ ...prev, phoneNo: value }));
                if (errors.phoneNo) setErrors((prev) => ({ ...prev, phoneNo: '' }));
              }}
              error={Boolean(errors.phoneNo)}
              helperText={errors.phoneNo || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
        </FormSection>

        <FormSection title="Organization" description="Company and role assignment." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControl size="small" fullWidth required error={Boolean(errors.companiesId)} sx={formFieldSx}>
              <InputLabel id="create-company-label" shrink>Company</InputLabel>
              <Select
                labelId="create-company-label"
                name="companiesId"
                label="Company"
                value={form.companiesId ?? ''}
                onChange={handleChange}
                displayEmpty
                notched
                MenuProps={selectMenuProps}
              >
                <MenuItem value="">Select company</MenuItem>
                {companies.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.companiesId || ' '}</FormHelperText>
            </FormControl>
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControl size="small" fullWidth required error={Boolean(errors.userRoleId)} sx={formFieldSx}>
              <InputLabel id="create-role-label" shrink>Role</InputLabel>
              <Select
                labelId="create-role-label"
                name="userRoleId"
                label="Role"
                value={form.userRoleId ?? ''}
                onChange={handleChange}
                displayEmpty
                notched
                MenuProps={selectMenuProps}
              >
                <MenuItem value="">Select role</MenuItem>
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                ))}
              </Select>
              <FormHelperText>{errors.userRoleId || ' '}</FormHelperText>
            </FormControl>
          </FormGridItem>
        </FormSection>

        <FormSection title="Profile" description="Profile image upload." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', mb: 0.75 }}>
              Profile image
            </Typography>
            <Box
              component="input"
              type="file"
              accept="image/*"
              onChange={handleImage}
              sx={{
                display: 'block',
                width: '100%',
                fontSize: '0.875rem',
                color: 'var(--text)',
                bgcolor: '#fff',
                border: '1px solid var(--card-border)',
                borderRadius: 2,
                px: 1.5,
                py: 1,
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
                },
              }}
            />
          </FormGridItem>
        </FormSection>

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSave}
          submitLabel={saving ? 'Saving…' : 'Create'}
          submitDisabled={saving}
        />
      </Paper>
    </FormPageLayout>
  );
}
