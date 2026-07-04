/** Shared responsive layout styles for agreement template create / edit / view pages. */
export const pageSx = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
};

export const headerRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  mb: 2,
  minWidth: 0,
};

export const backButtonSx = {
  color: '#1e293b',
  bgcolor: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 2,
  width: 36,
  height: 36,
  flexShrink: 0,
  '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1' },
};

export const titleSx = {
  fontSize: { xs: '1.15rem', sm: '1.5rem' },
  fontWeight: 800,
  color: 'var(--text)',
  m: 0,
  minWidth: 0,
  lineHeight: 1.3,
};

export const cardSx = {
  bgcolor: '#fff',
  borderRadius: 2,
  boxShadow: '0 4px 16px rgba(26, 43, 61, 0.05)',
  border: '1px solid var(--card-border)',
  p: { xs: 1.5, sm: 2 },
  width: '100%',
  minWidth: 0,
  overflow: 'hidden',
};
export const gridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: { xs: 2, sm: '20px 24px' },
  width: '100%',
  minWidth: 0,
};

export const fullWidthFieldSx = {
  gridColumn: '1 / -1',
  minWidth: 0,
};

export const fieldWrapSx = {
  minWidth: 0,
  width: '100%',
};

export const actionsSx = {
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  gap: 1.25,
  mt: 3.5,
};

export const submitBtnSx = {
  background: '#0084fe',
  color: '#fff',
  border: 'none',
  borderRadius: 2,
  px: 3.5,
  py: 1.25,
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  width: { xs: '100%', sm: 'auto' },
  fontFamily: 'inherit',
  '&:disabled': { opacity: 0.7, cursor: 'not-allowed' },
};

export const cancelBtnSx = {
  background: '#fff',
  color: '#64748b',
  border: '1px solid #e2e8f0',
  borderRadius: 2,
  px: 3.5,
  py: 1.25,
  fontSize: '0.875rem',
  fontWeight: 500,
  cursor: 'pointer',
  width: { xs: '100%', sm: 'auto' },
  fontFamily: 'inherit',
};
