import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';
import { loginWithApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRoute } from '../../utils/rbac';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const sessionMessage = useMemo(() => {
    if (searchParams.get('session') === 'expired') {
      return 'Your session expired. Please sign in again with your AvecADeskApi account.';
    }
    return '';
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const apiUser = await loginWithApi(email, password);
      login(apiUser);
      navigate(getDefaultRoute(apiUser.role), { replace: true });
    } catch (err) {
      setError(
        err.message === 'Request failed'
          ? 'Cannot reach AvecADeskApi. Make sure the API is running on https://localhost:7099 and try again.'
          : err.message || 'Invalid email or password. Use your database user credentials.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Welcome Back
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 4.5 }}>
        Enter your details to manage your dashboard.
      </Typography>

      {sessionMessage && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          {sessionMessage}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: 3 }}>
          <Typography component="label" htmlFor="login-email" sx={loginLabelSx}>
            Email Address
          </Typography>
          <TextField
            id="login-email"
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

        <Box sx={{ mb: 2 }}>
          <Typography component="label" htmlFor="login-password" sx={loginLabelSx}>
            Password
          </Typography>
          <TextField
            id="login-password"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={{
              ...loginFieldSx,
              '& .MuiOutlinedInput-root.MuiInputBase-adornedEnd': { paddingRight: 0 },
            }}
            slotProps={{
              input: {
                sx: { px: 1.875 },
                autoComplete: 'current-password',
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

        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              sx={{ color: '#cbd5e1', '&.Mui-checked': { color: '#2f80c9' } }}
            />
          }
          label={<Typography sx={{ fontSize: '0.8125rem', color: '#334155' }}>Remember Me</Typography>}
          sx={{ mb: 2, ml: 0 }}
        />

        <Button type="submit" fullWidth disabled={submitting} sx={loginButtonSx}>
          {submitting ? 'Signing in…' : 'Log In'}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link href="#" underline="none" sx={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 500 }}>
          Forgot Password?
        </Link>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1.5 }}>
        <Link
          component={RouterLink}
          to="/phone-verified"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          Phone Verified
        </Link>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1.5 }}>
        <Link
          component={RouterLink}
          to="/register"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          I am student - Register
        </Link>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', mt: 3 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Business Management Platform</Typography>
      </Box>
    </LoginSplitLayout>
  );
}
