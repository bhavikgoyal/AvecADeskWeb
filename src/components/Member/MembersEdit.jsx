import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, Paper } from '@mui/material';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { updateMember, getRoles, getCompanies } from '../../api/membersApi';
import { FormActions, FormPageLayout, formPaperSx } from '../forms';
import FormContentSkeleton from '../FormContentSkeleton';
import MemberFormFields from './MemberFormFields';

export default function MembersEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
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
    Password: '',
    ConfirmPassword: '',
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

    if (form.Password || form.ConfirmPassword) {
      if (!form.Password) newErrors.Password = 'Password is required';
      else if (form.Password.length < 6) newErrors.Password = 'Password must be at least 6 characters';

      if (!form.ConfirmPassword) newErrors.ConfirmPassword = 'Confirm password is required';
      else if (form.Password !== form.ConfirmPassword) newErrors.ConfirmPassword = 'Passwords do not match';
    }

    if (form.PhoneNo && !/^\d{10}$/.test(form.PhoneNo)) {
      newErrors.PhoneNo = 'Phone number must be exactly 10 digits';
    }

    return newErrors;
  };

  const fieldMap = {
    userName: 'UserName',
    firstName: 'FirstName',
    lastName: 'LastName',
    email: 'Email',
    phoneNo: 'PhoneNo',
    userRoleId: 'UserRoleId',
    companiesId: 'CompaniesId',
    isActive: 'IsActive',
    password: 'Password',
    confirmPassword: 'ConfirmPassword',
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const key = fieldMap[name] || name;
    setForm((prev) => ({ ...prev, [key]: type === 'checkbox' ? checked : value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
    if (serverError) setServerError('');
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, PhoneNo: value }));
    if (errors.PhoneNo) setErrors((prev) => ({ ...prev, PhoneNo: '' }));
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

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      await updateMember({
        ...form,
        ConfirmPassword: undefined,
        Password: form.Password?.trim() ? form.Password : undefined,
      });

      toast.success('Member updated successfully', {
        hideProgressBar: true,
      });
      navigate('/Members');
    } catch (err) {
      setServerError('Update failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <FormPageLayout title="Edit Member">
        <FormContentSkeleton rows={8} />
      </FormPageLayout>
    );
  }

  const fieldsForm = {
    userName: form.UserName,
    firstName: form.FirstName,
    lastName: form.LastName,
    email: form.Email,
    phoneNo: form.PhoneNo,
    userRoleId: form.UserRoleId,
    companiesId: form.CompaniesId,
    isActive: form.IsActive,
    avatarBase64: form.AvatarBase64,
    password: form.Password,
    confirmPassword: form.ConfirmPassword,
  };

  const fieldsErrors = {
    userName: errors.UserName,
    firstName: errors.FirstName,
    lastName: errors.LastName,
    email: errors.Email,
    phoneNo: errors.PhoneNo,
    userRoleId: errors.UserRoleId,
    companiesId: errors.CompaniesId,
    password: errors.Password,
    confirmPassword: errors.ConfirmPassword,
  };

  return (
    <FormPageLayout title="Edit Member">
      {serverError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {serverError}
        </Alert>
      )}

      <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
        <MemberFormFields
          form={fieldsForm}
          errors={fieldsErrors}
          companies={companies}
          roles={roles}
          onChange={handleChange}
          onPhoneChange={handlePhoneChange}
          onImageChange={handleImage}
          showAvatar
          userId={form.UserId}
          userName={form.UserName}
          includePassword
          passwordRequired={false}
          passwordPlaceholder="Leave blank to keep current password"
        />

        <FormActions
          onCancel={() => navigate('/Members')}
          onSubmit={handleSubmit}
          submitLabel="Update"
        />
      </Paper>
    </FormPageLayout>
  );
}
