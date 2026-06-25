import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMembers, deleteMember, resignMember } from "../../api/membersApi";
import { Session } from "../../utils/session";
import { toast } from 'react-toastify';

export default function MembersTable({ searchQuery = '' }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const role = Session.getRole();
  const isTeamLeader = role === "Team Leader";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getMembers();
        const normalized = Array.isArray(data)
          ? data.map((u) => ({
              ...u,
              UserId: u.userId ?? u.UserId,
              UserName: u.userName ?? u.UserName,
              FirstName: u.firstName ?? u.FirstName,
              LastName: u.lastName ?? u.LastName,
              Email: u.email ?? u.Email,
              PhoneNo: u.phoneNo ?? u.PhoneNo,
              MemberResignedOn: u.memberResignedOn ?? u.MemberResignedOn,
              UserRoleId: u.userRoleId ?? u.UserRoleId,
              CompaniesId: u.companiesId ?? u.CompaniesId,
              IsActive: u.isActive ?? u.IsActive ?? u.active ?? u.Active,
              AvatarBase64: u.avatarBase64 ?? u.AvatarBase64,
            }))
          : [];
        setRows(normalized);
      } catch (err) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const result = await deleteMember(userId);

      if (result.success) {
        setRows(prev => prev.filter(u => String(u.UserId) !== String(userId)));
       toast.error('Member deleted successfully');
      } else {
       console.error(result.message || 'Delete failed');
      }
    } catch (err) {
      console.error(err.message || 'Delete failed');
    }
  };

  const handleResign = async (userId) => {
    if (!window.confirm('Are you sure this member is resigning?')) return;

    try {
      const result = await resignMember(userId);

      if (result.success) {
        const resignDate = new Date().toISOString();
        setRows(prev =>
          prev.map(u => u.UserId === userId ? { ...u, MemberResignedOn: resignDate } : u)
        );
      toast.warning('Member marked as resigned');
      } else {
        toast.error(result.message || 'Failed to mark member as resigned');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to mark member as resigned');
    }
  };

  const filteredRows = rows.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      (r.UserName || '').toLowerCase().includes(q) ||
      (r.FirstName || '').toLowerCase().includes(q) ||
      (r.LastName || '').toLowerCase().includes(q) ||
      (r.Email || '').toLowerCase().includes(q) ||
      (r.PhoneNo || '').toLowerCase().includes(q) ||
      (r.roleName || '').toLowerCase().includes(q)
    );
  });

  if (loading) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
      Loading users...
    </div>
  );

  if (error) return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: '#ef4444' }}>
      Error: {error}
    </div>
  );

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #eef0f3' }}>
            <th style={thStyle}>Roll</th>
            <th style={thStyle}>Username</th>
            <th style={thStyle}>Full name</th>
            <th style={thStyle}>Email</th>
            <th style={thStyle}>Phone</th>
            <th style={thStyle}>Role Name</th>
            <th style={thStyle}>Active</th>
            {!isTeamLeader && <th style={thStyle}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {filteredRows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
                No users found.
              </td>
            </tr>
          )}
          {filteredRows.map((r, index) => (
            <tr key={r.UserId} style={{ borderBottom: '1px solid #f1f3f5' }}>
              <td style={tdStyle}>{index + 1}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap' }}>
                 <img
  src={
    r.AvatarBase64
      ? r.AvatarBase64
      : `https://i.pravatar.cc/100?u=${r.UserId || r.UserName}`
  }
  alt={r.UserName}
  style={{
    width: 36,
    height: 36,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #e8ecf0',
    flexShrink: 0
  }}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = `https://i.pravatar.cc/100?u=${r.UserId || r.UserName}`;
  }}
/>
                  <span style={{ fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap' }}>
                    {r.UserName}
                  </span>
                </div>
              </td>
              <td style={tdStyle}>{`${r.FirstName || ''} ${r.LastName || ''}`.trim()}</td>
              <td style={tdStyle}>{r.Email}</td>
              <td style={tdStyle}>{r.PhoneNo || ''}</td>
              <td style={tdStyle}>{r.roleName}</td>
              <td style={tdStyle}>{(r.IsActive ?? r.Active) ? 'Yes' : 'No'}</td>
              {!isTeamLeader && (
                <td style={tdStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                    <button
                      onClick={() => navigate(`/Members/Edit/${r.UserId}`, { state: { user: r } })}
                      style={iconBtnStyle} title="Edit"
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(r.UserId)}
                      style={iconBtnStyle} title="Delete"
                    >🗑️</button>
                    <button
                      onClick={() => handleResign(r.UserId)}
                      style={resignBtnStyle}
                    >Resign</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  padding: '14px 20px',
  textAlign: 'left',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#64748b',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px 20px',
  color: '#334155',
  verticalAlign: 'middle',
};

const iconBtnStyle = {
  width: 32,
  height: 32,
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  background: '#ffffff',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.875rem',
  padding: 0,
};

const resignBtnStyle = {
  padding: '5px 12px',
  border: '1px solid #0084fe',
  borderRadius: 6,
  background: '#ffffff',
  color: '#0084fe',
  fontSize: '0.8125rem',
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};