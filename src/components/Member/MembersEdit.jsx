import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Session } from "../../utils/session";
import { updateMember, getRoles, getCompanies } from "../../api/membersApi";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const authHeaders = () => {
  const token = Session.getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
};

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
    UserId: id, UserName: '', FirstName: '', LastName: '',
    Email: '', PhoneNo: '', UserRoleId: '',
    CompaniesId: '', IsActive: true, AvatarBase64: ''
  });

  useEffect(() => {
    if (state?.user) {
      setForm(f => ({
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
    ''
      }));
    }
  }, [state]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLoading(true);
       const [rolesData, companiesData] = await Promise.all([
  getRoles(),
  getCompanies()
]);

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

if (form.PhoneNo && !/^\d{10}$/.test(form.PhoneNo))
  newErrors.PhoneNo = 'Phone number must be exactly 10 digits';

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, AvatarBase64: reader.result }));
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
     const res = await updateMember(form);
      if (res.ok) {toast.success("Member updated successfully", {
    hideProgressBar: true,
}); navigate('/Members'); }
      else setServerError('Update failed: ' + await res.text());
    } catch (err) {
      setServerError('Update failed: ' + err.message);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ padding: '24px 32px' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', marginBottom: 24 }}>
        Edit Member
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
              <input name="UserName" value={form.UserName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.UserName ? '#ef4444' : '#e2e8f0' }} />
              {errors.UserName && <p style={errStyle}>{errors.UserName}</p>}
            </div>

            {/* First Name */}
            <div>
              <label style={labelStyle}>First Name <span style={reqStyle}>*</span></label>
              <input name="FirstName" value={form.FirstName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.FirstName ? '#ef4444' : '#e2e8f0' }} />
              {errors.FirstName && <p style={errStyle}>{errors.FirstName}</p>}
            </div>

            {/* Last Name */}
            <div>
              <label style={labelStyle}>Last Name <span style={reqStyle}>*</span></label>
              <input name="LastName" value={form.LastName} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.LastName ? '#ef4444' : '#e2e8f0' }} />
              {errors.LastName && <p style={errStyle}>{errors.LastName}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email <span style={reqStyle}>*</span></label>
              <input name="Email" type="email" value={form.Email} onChange={handleChange}
                style={{ ...inputStyle, borderColor: errors.Email ? '#ef4444' : '#e2e8f0' }} />
              {errors.Email && <p style={errStyle}>{errors.Email}</p>}
            </div>

            {/* Company */}
            <div>
              <label style={labelStyle}>Company <span style={reqStyle}>*</span></label>
              <select name="CompaniesId" value={form.CompaniesId} onChange={handleChange}
                style={{ ...selectStyle, borderColor: errors.CompaniesId ? '#ef4444' : '#e2e8f0' }}>
                <option value="">Select Company</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.CompaniesId && <p style={errStyle}>{errors.CompaniesId}</p>}
            </div>

            {/* Role */}
            <div>
              <label style={labelStyle}>Role <span style={reqStyle}>*</span></label>
              <select name="UserRoleId" value={form.UserRoleId} onChange={handleChange}
                style={{ ...selectStyle, borderColor: errors.UserRoleId ? '#ef4444' : '#e2e8f0' }}>
                <option value="">Select Role</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {errors.UserRoleId && <p style={errStyle}>{errors.UserRoleId}</p>}
            </div>

           {/* Phone */}
<div>
  <label style={labelStyle}>Phone</label>
  <input
    name="PhoneNo"
    type="text"
    value={form.PhoneNo}
    maxLength={10}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '');
      setForm(prev => ({
        ...prev,
        PhoneNo: value.slice(0, 10)
      }));

      if (errors.PhoneNo) {
        setErrors(prev => ({
          ...prev,
          PhoneNo: ''
        }));
      }
    }}
    style={{
      ...inputStyle,
      borderColor: errors.PhoneNo ? '#ef4444' : '#e2e8f0'
    }}
  />
  {errors.PhoneNo && <p style={errStyle}>{errors.PhoneNo}</p>}
</div>

{/* Is Active */}
<div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      fontSize: '0.875rem',
      color: '#475569'
    }}
  >
    <input
      type="checkbox"
      name="IsActive"
      checked={form.IsActive}
      onChange={handleChange}
      style={{
        width: 18,
        height: 18,
        accentColor: '#0084fe',
        cursor: 'pointer'
      }}
    />
    Is Active
  </label>
</div>

            {/* Profile Image */}
            <div>
              <label style={labelStyle}>Profile Image</label>
              <input type="file" accept="image/*" onChange={handleImage} style={inputStyle} />
            </div>

            {/* Current Image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={labelStyle}>Current Image</label>
              <img
             src={
    form.AvatarBase64
        ? form.AvatarBase64
        : `/images/${form.UserName}.png`
}
                alt="Avatar"
                onError={(e) => { e.target.onerror = null; e.target.src = `https://i.pravatar.cc/100?u=${form.UserId}`; }}
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e8ecf0' }}
              />
            </div>

          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            <button type="submit" style={submitBtnStyle}>Update</button>
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