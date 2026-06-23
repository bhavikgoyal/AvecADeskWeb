import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { Session } from '../../utils/session';
import { createMember, getRoles, getCompanies } from '../../api/membersApi';
import { FormActions, FormPageLayout, formPaperSx } from '../forms';
import MemberFormFields from './MemberFormFields';

const emptyForm = {
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
};

export default function MembersCreate() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [rolesData, companiesData] = await Promise.all([getRoles(), getCompanies()]);
        setRoles(rolesData || []);
        setCompanies(companiesData || []);
      } catch (err) {
        alert(`Failed to load roles / companies: ${err.message}`);
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
      const token = Session.getToken();
      if (!token) {
        alert('You are not logged in.');
        return;
      }

      const res = await createMember(form);
      if (res.ok) {
        alert('Member created successfully');
        navigate('/Members');
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setErrors({ userName: data.message || 'Username already exists' });
        return;
      }

      setServerError(`Failed to create member: ${await res.text()}`);
    } catch (err) {
      setServerError(`Failed to create member: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormPageLayout
      title="Add new member"
      subtitle="Create a member account with company and role assignment."
      metaItems={[
        { label: 'Module', value: 'Members' },
        { label: 'Action', value: 'Create member' },
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
        />

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSubmit}
          submitLabel={submitting ? 'Saving...' : 'Create Member'}
          submitDisabled={submitting}
        />
      </Paper>
    </FormPageLayout>
  );
}
