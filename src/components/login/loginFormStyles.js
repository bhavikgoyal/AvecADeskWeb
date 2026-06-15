export const LOGIN_LOGO = '/images/login/global_logo.png';
export const LOGIN_HERO = '/images/login/login_groupImg.png';
export const LOGIN_COPYRIGHT = 'Copyright © 2026 Abroad Visa & Education Consultants. All Rights Reserved.';

export const autofillInputSx = {
  WebkitBoxShadow: '0 0 0 1000px #fff inset',
  WebkitTextFillColor: '#0f172a',
  caretColor: '#0f172a',
  borderRadius: '10px',
  transition: 'background-color 5000s ease-in-out 0s',
};

export const loginFieldSx = {
  '& .MuiOutlinedInput-root': {
    height: 50,
    borderRadius: '10px',
    bgcolor: '#fff',
    fontSize: '0.875rem',
    '& fieldset': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: '#cbd5e1' },
    '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: '1.5px' },
  },
  '& .MuiOutlinedInput-input': {
    '&:-webkit-autofill': autofillInputSx,
    '&:-webkit-autofill:hover': autofillInputSx,
    '&:-webkit-autofill:focus': autofillInputSx,
    '&:-webkit-autofill:active': autofillInputSx,
  },
};

export const loginLabelSx = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 600,
  color: '#334155',
  mb: 0.75,
};

export const loginButtonSx = {
  height: 52,
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #5aa9e6, #2f80c9)',
  color: '#fff',
  fontWeight: 600,
  fontSize: '1rem',
  textTransform: 'none',
  boxShadow: 'none',
  '&:hover': {
    background: 'linear-gradient(135deg, #4f9fd9, #2874b8)',
    boxShadow: '0 8px 20px rgba(47, 128, 201, 0.35)',
  },
};
