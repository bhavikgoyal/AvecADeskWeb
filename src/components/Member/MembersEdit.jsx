import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Paper, Typography } from '@mui/material';
import { updateMember, getRoles, getCompanies } from '../../api/membersApi';
import { FormActions, FormPageLayout, formPaperSx } from '../forms';
import MemberFormFields from './MemberFormFields';

const emptyForm = {
  userId: '',
  userName: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNo: '',
  userRoleId: '',
  companiesId: '',
  isActive: true,
  avatarBase64: '',
};

function mapUserToForm(user = {}) {
  return {
    userId: user.UserId ?? user.userId ?? '',
    userName: user.UserName ?? user.userName ?? '',
    firstName: user.FirstName ?? user.firstName ?? '',
    lastName: user.LastName ?? user.lastName ?? '',
    email: user.Email ?? user.email ?? '',
    phoneNo: user.PhoneNo ?? user.phoneNo ?? '',
    userRoleId: user.UserRoleId ?? user.userRoleId ?? '',
    companiesId: user.CompaniesId ?? user.companiesId ?? '',
    isActive: user.IsActive ?? user.isActive ?? true,
    avatarBase64: user.Avatar ?? user.avatar ?? user.avatarBase64 ?? '',
  };
}

function mapFormToPayload(form) {
  return {
    UserId: form.userId,
    UserName: form.userName,
    FirstName: form.firstName,
    LastName: form.lastName,
    Email: form.email,
    PhoneNo: form.phoneNo,
    UserRoleId: form.userRoleId,
    CompaniesId: form.companiesId,
    IsActive: form.isActive,
    AvatarBase64: form.avatarBase64,
  };
}

export default function MembersEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [form, setForm] = useState(() =>
    state?.user ? mapUserToForm(state.user) : { ...emptyForm, userId: id },
  );

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

  const roleName = useMemo(
    () => roles.find((role) => String(role.id) === String(form.userRoleId))?.name || '—',
    [roles, form.userRoleId],
  );

  const companyName = useMemo(
    () => companies.find((company) => String(company.id) === String(form.companiesId))?.name || '—',
    [companies, form.companiesId],
  );

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

    if (form.phoneNo && !/^\d{10}$/.test(form.phoneNo)) {
      newErrors.phoneNo = 'Phone number must be exactly 10 digits';
    }

    return newErrors;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handlePhoneChange = (event) => {
    const value = event.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phoneNo: value }));
    if (errors.phoneNo) setErrors((prev) => ({ ...prev, phoneNo: '' }));
    if (serverError) setServerError('');
  };

  const handleImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setForm((prev) => ({ ...prev, avatarBase64: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setServerError('');

    try {
      const res = await updateMember(mapFormToPayload(form));
      if (res.ok) {
        alert('Member updated successfully');
        navigate('/Members');
      } else {
        setServerError(`Update failed: ${await res.text()}`);
      }
    } catch (err) {
      setServerError(`Update failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>Loading member...</Typography>
      </Box>
    );
  }

  const fullName = `${form.firstName} ${form.lastName}`.trim() || form.userName || 'Member';

  return (
    <FormPageLayout
      title="Edit member"
      subtitle={`${fullName} • ${roleName} • ${companyName}`}
      metaItems={[
        { label: 'Member ID', value: id },
        { label: 'Status', value: form.isActive ? 'Active' : 'Inactive' },
        { label: 'Module', value: 'Members' },
      ]}
    >
      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        {serverError && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {serverError}
          </Alert>
        )}

        <MemberFormFields
          form={form}
          errors={errors}
          companies={companies}
          roles={roles}
          onChange={handleChange}
          onPhoneChange={handlePhoneChange}
          onImageChange={handleImage}
          showAvatar
          userId={form.userId}
          userName={form.userName}
        />

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSubmit}
          submitLabel={submitting ? 'Updating...' : 'Update Member'}
          submitDisabled={submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
