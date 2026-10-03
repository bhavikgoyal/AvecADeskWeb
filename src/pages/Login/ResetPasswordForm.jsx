import { useState } from 'react';
import { Alert, Box, Button, IconButton, InputAdornment, Link, TextField, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';
import { resetPasswordApi } from '../../api/authApi';

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing or invalid reset link.');
      return;
    }
    if (newPassword.length > 50) {
      setError('Password must be 50 characters or fewer.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordApi(token, newPassword, confirmPassword);
      navigate('/login?reset=success', { replace: true });
    } catch (err) {
      setError(
        err.message === 'Request failed'
          ? 'Cannot reach AvecADeskApi. Make sure the API is running on https://localhost:7099 and try again.'
          : err.message || 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Reset Password
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 4.5 }}>
        Enter your new password below.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: 3 }}>
          <Typography component="label" htmlFor="new-password" sx={loginLabelSx}>
            New Password
          </Typography>
          <TextField
            id="new-password"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            name="newPassword"
            autoComplete="new-password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            sx={{
              ...loginFieldSx,
              '& .MuiOutlinedInput-root.MuiInputBase-adornedEnd': { paddingRight: 0 },
            }}
            slotProps={{
              input: {
                sx: { px: 1.875 },
                autoComplete: 'new-password',
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ color: '#94a3b8', mr: 0.5 }}
                    >
                      {showPassword ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography component="label" htmlFor="confirm-password" sx={loginLabelSx}>
            Confirm Password
          </Typography>
          <TextField
            id="confirm-password"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            sx={loginFieldSx}
            slotProps={{ input: { sx: { px: 1.875 }, autoComplete: 'new-password' } }}
          />
        </Box>

        <Button type="submit" fullWidth disabled={submitting} sx={loginButtonSx}>
          {submitting ? 'Resetting…' : 'Reset Password'}
        </Button>
      </Box>

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