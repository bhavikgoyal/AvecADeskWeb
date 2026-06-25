import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'
import { Session } from "../../utils/session";
import { createMember, getRoles, getCompanies } from "../../api/membersApi";

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
  userRoleId: '',
  companiesId: '',
  isActive: true,
  avatarBase64: ''
});

  useEffect(() => {
   const loadLookups = async () => {
  try {
    const [rolesData, companiesData] = await Promise.all([
      getRoles(),
      getCompanies()
    ]);

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

if (form.phoneNo && !/^\d{10}$/.test(form.phoneNo))
  newErrors.phoneNo = 'Phone number must be exactly 10 digits';

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
    // clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm({ ...form, avatarBase64: reader.result });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const token = Session.getToken();
      if (!token) { alert('You are not logged in.'); return; }

    const res = await createMember(form);
      if (res.ok) { alert('Member created successfully'); navigate('/Members'); return; }

      if (res.status === 409) {
        const data = await res.json();
        setErrors({ userName: data.message || 'Username already exists' });
        return;
      }
      
      setServerError(`Failed to create member: ${await res.text()}`);
    } catch (err) {
      setServerError('Failed to create member: ' + err.message);
    }
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Member Create
      </h2>

      {serverError && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.875rem' }}>
          {serverError}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)', border: '1px solid #eef0f3', padding: '28px 32px' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>

            {/* Username */}
            <div>
              <label style={labelStyle}>Username <span style={reqStyle}>*</span></label>
              <input name="userName" value={form.userName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.userName ? '#ef4444' : '#e2e8f0' }} />
              {errors.userName && <p style={errStyle}>{errors.userName}</p>}
            </div>

            {/* First Name */}
            <div>
              <label style={labelStyle}>First Name <span style={reqStyle}>*</span></label>
              <input name="firstName" value={form.firstName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.firstName ? '#ef4444' : '#e2e8f0' }} />
              {errors.firstName && <p style={errStyle}>{errors.firstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label style={labelStyle}>Last Name <span style={reqStyle}>*</span></label>
              <input name="lastName" value={form.lastName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.lastName ? '#ef4444' : '#e2e8f0' }} />
              {errors.lastName && <p style={errStyle}>{errors.lastName}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.email ? '#ef4444' : '#e2e8f0' }} />
              {errors.email && <p style={errStyle}>{errors.email}</p>}
            </div>

            {/* Company */}
            <div>
              <label style={labelStyle}>Company <span style={reqStyle}>*</span></label>
              <select name="companiesId" value={form.companiesId} onChange={handleChange}
                style={{ ...selectStyle, borderColor: errors.companiesId ? '#ef4444' : '#e2e8f0' }}>
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.companiesId && <p style={errStyle}>{errors.companiesId}</p>}
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>Role <span style={reqStyle}>*</span></label>
              <select name="userRoleId" value={form.userRoleId} onChange={handleChange}
                style={{ ...selectStyle, borderColor: errors.userRoleId ? '#ef4444' : '#e2e8f0' }}>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.userRoleId && <p style={errStyle}>{errors.userRoleId}</p>}
            </div>

           {/* Phone */}
<div>
  <label style={labelStyle}>Phone</label>
  <input
    name="phoneNo"
    type="text"
    value={form.phoneNo}
    maxLength={10}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '');

      setForm(prev => ({
        ...prev,
        phoneNo: value.slice(0, 10)
      }));

      if (errors.phoneNo) {
        setErrors(prev => ({
          ...prev,
          phoneNo: ''
        }));
      }
    }}
    style={{
      ...inputStyle,
      borderColor: errors.phoneNo ? '#ef4444' : '#e2e8f0'
    }}
  />
  {errors.phoneNo && <p style={errStyle}>{errors.phoneNo}</p>}
</div>

            {/* IsActive */}
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem', color: '#475569' }}>
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange}
                  style={{ width: 18, height: 18, accentColor: '#0084fe', cursor: 'pointer' }} />
                IsActive
              </label>
            </div>

            {/* Profile Image */}
            <div style={{ gridColumn: '1 / 2' }}>
              <label style={labelStyle}>Profile Image</label>
              <input type="file" accept="image/*" onChange={handleImage} style={inputStyle} />
            </div>

          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button type="submit" style={submitBtnStyle}>Create</button>
            <button type="button" onClick={() => navigate('/Members')} style={cancelBtnStyle}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', marginBottom: 6 };
const reqStyle = { color: '#ef4444' };
const errStyle = { color: '#ef4444', fontSize: '0.78rem', marginTop: 4, marginBottom: 0 };
const inputStyle = { display: 'block', width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', fontSize: '0.875rem', color: '#1e293b', background: '#fff', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' };
const selectStyle = { ...inputStyle, appearance: 'none', cursor: 'pointer', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: 36 };
const submitBtnStyle = { background: '#0084fe', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' };
const cancelBtnStyle = { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 28px', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' };