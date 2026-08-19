import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import { updateMember, getRoles, getCompanies } from '../../api/membersApi';
import {
  FormActions,
  FormGridItem,
  FormPageLayout,
  FormSection,
  formFieldSx,
  formPaperSx,
  selectMenuProps,
} from '../forms';
import FormContentSkeleton from '../FormContentSkeleton';

export default function MembersEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const [form, setForm] = useState({
    UserId: id,
    UserName: '',
    FirstName: '',
    LastName: '',
    Email: '',
    PhoneNo: '',
    UserRoleId: '',
    CompaniesId: '',
    IsActive: true,
    AvatarBase64: '',
  });

  useEffect(() => {
    if (state?.user) {
      setForm((f) => ({
        ...f,
        UserId: state.user.UserId,
        UserName: state.user.UserName || '',
        FirstName: state.user.FirstName || '',
        LastName: state.user.LastName || '',
        Email: state.user.Email || '',
        PhoneNo: state.user.PhoneNo || '',
        UserRoleId: state.user.UserRoleId || '',
        CompaniesId: state.user.CompaniesId || '',
        IsActive: state.user.IsActive ?? true,
        AvatarBase64:
          state.user.AvatarBase64 ||
          state.user.avatarBase64 ||
          state.user.Avatar ||
          '',
      }));
    }
  }, [state]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLoading(true);
        const [rolesData, companiesData] = await Promise.all([getRoles(), getCompanies()]);
        setRoles(rolesData || []);
        setCompanies(companiesData || []);
      } catch (err) {
        console.error('Failed to load lookups:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLookups();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!form.UserName.trim()) newErrors.UserName = 'Username is required';
    else if (form.UserName.length < 3) newErrors.UserName = 'Username must be at least 3 characters';
    if (!form.FirstName.trim()) newErrors.FirstName = 'First name is required';
    if (!form.LastName.trim()) newErrors.LastName = 'Last name is required';
    if (!form.Email.trim()) newErrors.Email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.Email)) newErrors.Email = 'Enter a valid email';
    if (!form.CompaniesId) newErrors.CompaniesId = 'Please select a company';
    if (!form.UserRoleId) newErrors.UserRoleId = 'Please select a role';
    if (form.PhoneNo && !/^\d{10}$/.test(form.PhoneNo)) newErrors.PhoneNo = 'Phone number must be exactly 10 digits';
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm((prev) => ({ ...prev, AvatarBase64: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      await updateMember(form);
      toast.success('Member updated successfully', { hideProgressBar: true });
      navigate('/Members');
    } catch (err) {
      setServerError('Update failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormPageLayout title="Edit Member">
        <FormContentSkeleton rows={8} />
      </FormPageLayout>
    );
  }

  return (
    <FormPageLayout title="Edit Member">
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
              name="UserName"
              label="Username"
              value={form.UserName}
              onChange={handleChange}
              error={Boolean(errors.UserName)}
              helperText={errors.UserName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="Email"
              type="email"
              label="Email"
              value={form.Email}
              onChange={handleChange}
              error={Boolean(errors.Email)}
              helperText={errors.Email || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Checkbox
                  name="IsActive"
                  checked={form.IsActive}
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
              name="FirstName"
              label="First name"
              value={form.FirstName}
              onChange={handleChange}
              error={Boolean(errors.FirstName)}
              helperText={errors.FirstName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              required
              name="LastName"
              label="Last name"
              value={form.LastName}
              onChange={handleChange}
              error={Boolean(errors.LastName)}
              helperText={errors.LastName || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <TextField
              size="small"
              fullWidth
              name="PhoneNo"
              label="Phone"
              value={form.PhoneNo}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setForm((prev) => ({ ...prev, PhoneNo: value }));
                if (errors.PhoneNo) setErrors((prev) => ({ ...prev, PhoneNo: '' }));
              }}
              error={Boolean(errors.PhoneNo)}
              helperText={errors.PhoneNo || ' '}
              sx={formFieldSx}
            />
          </FormGridItem>
        </FormSection>

        <FormSection title="Organization" description="Company and role assignment." divider={false}>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControl size="small" fullWidth required error={Boolean(errors.CompaniesId)} sx={formFieldSx}>
              <InputLabel id="company-label" shrink>Company</InputLabel>
              <Select
                labelId="company-label"
                name="CompaniesId"
                label="Company"
                value={form.CompaniesId ?? ''}
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
              <FormHelperText>{errors.CompaniesId || ' '}</FormHelperText>
            </FormControl>
          </FormGridItem>
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <FormControl size="small" fullWidth required error={Boolean(errors.UserRoleId)} sx={formFieldSx}>
              <InputLabel id="role-label" shrink>Role</InputLabel>
              <Select
                labelId="role-label"
                name="UserRoleId"
                label="Role"
                value={form.UserRoleId ?? ''}
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
              <FormHelperText>{errors.UserRoleId || ' '}</FormHelperText>
            </FormControl>
          </FormGridItem>
        </FormSection>

        <FormSection title="Profile" description="Profile image upload and preview." divider={false}>
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
          <FormGridItem size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', mb: 0.75 }}>
              Current image
            </Typography>
            <Box
              component="img"
              src={form.AvatarBase64 ? form.AvatarBase64 : `/images/${form.UserName}.png`}
              alt="Avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://i.pravatar.cc/100?u=${form.UserId}`;
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
        </FormSection>

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSave}
          submitLabel={saving ? 'Saving…' : 'Save'}
          submitDisabled={saving}
        />
      </Paper>
    </FormPageLayout>
  );
}
