export const FORM_PAGE_MAX_WIDTH = '100%';

/** xs: 1 col | md: 2 cols | lg: 3 cols — full-width section */
export const defaultFieldGrid = { xs: 12, md: 6, lg: 4 };

/** xs: 1 col | md+: 2 cols — side-by-side section panel */
export const compactFieldGrid = { xs: 12, md: 6 };

export const formPaperSx = {
  borderRadius: 2,
  p: { xs: 1.25, sm: 1.5, md: 1.75 },
  width: '100%',
  backgroundColor: '#fff',
  border: '1px solid var(--card-border)',
  boxShadow: '0 2px 12px rgba(26, 43, 61, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 1.25,
};

export const formFieldSx = {
  width: '100%',
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#f8fafc',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': { backgroundColor: '#fff' },
    '&.Mui-focused': {
      backgroundColor: '#fff',
      boxShadow: '0 0 0 3px rgba(51, 133, 198, 0.12)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 600,
    fontSize: '0.875rem',
    transition: 'none',
  },
  '& input[type="date"]': {
    minHeight: 40,
  },
  '& input[type="date"]::-webkit-datetime-edit': {
    lineHeight: 1.5,
  },
};

export const formActionsSx = {
  mt: 1.5,
  pt: 1.5,
  borderTop: '1px solid var(--muted-border)',
};

export const outlineButtonSx = {
  textTransform: 'none',
  minWidth: 110,
  height: 36,
  borderRadius: 2,
  fontWeight: 600,
  fontSize: '0.875rem',
  color: 'var(--text)',
  bgcolor: '#fff',
  borderColor: 'var(--card-border)',
  '&:hover': { borderColor: 'var(--primary)', bgcolor: 'var(--primary-soft)' },
};

export const primaryButtonSx = {
  textTransform: 'none',
  minWidth: 130,
  height: 36,
  borderRadius: 2,
  fontWeight: 600,
  fontSize: '0.875rem',
  bgcolor: 'var(--primary)',
  color: '#fff',
  boxShadow: '0 2px 8px rgba(51, 133, 198, 0.25)',
  '&:hover': { bgcolor: 'var(--primary-dark)', boxShadow: '0 4px 12px rgba(51, 133, 198, 0.32)' },
};
