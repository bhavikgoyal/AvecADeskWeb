import { useState } from 'react';
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';
import { forgotPasswordApi } from '../../api/authApi';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPasswordApi(email);
      setSent(true);
    } catch (err) {
     setError( 
  err.message === 'Request failed'
    ? 'Cannot reach AvecADeskApi. Make sure the API is running and try again.' 
    : err.message || 'Something went wrong. Please try again.',
);

    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Forgot Password
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 4.5 }}>
        Enter your email and we'll send you a reset link.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {sent ? (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          If an account with that email exists, a reset link has been sent.
        </Alert>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Box sx={{ mb: 3 }}>
            <Typography component="label" htmlFor="forgot-email" sx={loginLabelSx}>
              Email Address
            </Typography>
            <TextField
              id="forgot-email"
              fullWidth
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 }, autoComplete: 'email' } }}
            />
          </Box>

          <Button type="submit" fullWidth disabled={submitting} sx={loginButtonSx}>
            {submitting ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink}
          to="/login"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          Back to Login
        </Link>
      </Box>
    </LoginSplitLayout>
  );
}