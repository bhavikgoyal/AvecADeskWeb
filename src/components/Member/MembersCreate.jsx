import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Session } from '../../utils/session';
import { createMember, getRoles, getCompanies } from '../../api/membersApi';
import { FormActions, FormPageLayout, formPaperSx } from '../forms';
import MemberFormFields from './MemberFormFields';

export default function MembersCreate() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    userName: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNo: '',
    password: '',
    confirmPassword: '',
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

    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (!form.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (form.phoneNo && !/^\d{10}$/.test(form.phoneNo)) {
      newErrors.phoneNo = 'Phone number must be exactly 10 digits';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, phoneNo: value }));
    if (errors.phoneNo) setErrors((prev) => ({ ...prev, phoneNo: '' }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, avatarBase64: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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

      await createMember({
        ...form,
        confirmPassword: undefined,
      });
      setTimeout(() => {
        navigate('/Members');
      }, 1500);
      toast.success('Member created successfully', {
        hideProgressBar: true,
      });
    } catch (res) {
      if (res.status === 409) {
        const data = await res.json();
        setErrors({ userName: data.message || 'Username already exists' });
        return;
      }

      setServerError(`Failed to create member: ${await res.text()}`);
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
        <MemberFormFields
          form={form}
          errors={errors}
          companies={companies}
          roles={roles}
          onChange={handleChange}
          onPhoneChange={handlePhoneChange}
          onImageChange={handleImage}
          includePassword
          passwordRequired
        />

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSubmit}
          submitLabel="Create"
        />
      </Paper>
    </FormPageLayout>
  );
}
