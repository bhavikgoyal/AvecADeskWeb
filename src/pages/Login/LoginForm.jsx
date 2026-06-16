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
import { useNavigate, useSearchParams } from 'react-router-dom';
const LOGIN_LOGO = '/images/login/global_logo.png';
const LOGIN_HERO = '/images/login/login_groupImg.png';
import { loginWithApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { getDefaultRoute } from '../../utils/rbac';
import '../../styles/LoginForm.css';

const COPYRIGHT = 'Copyright © 2026 Abroad Visa & Education Consultants. All Rights Reserved.';

const autofillInputSx = {
  WebkitBoxShadow: '0 0 0 1000px #fff inset',
  WebkitTextFillColor: '#0f172a',
  caretColor: '#0f172a',
  borderRadius: '10px',
  transition: 'background-color 5000s ease-in-out 0s',
};

const fieldSx = {
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
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#334155',
    mb: 0.75,
    position: 'static',
    transform: 'none',
    '&.Mui-focused': { color: '#334155' },
  },
  '& .MuiFormLabel-asterisk': { color: '#ef4444' },
};

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
    <Box
      className="login-page"
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        bgcolor: '#fff',
        fontFamily: "'Inter', sans-serif",
        overflow: { xs: 'auto', md: 'hidden' },
      }}
    >
      {/* Left — form */}
      <Box
        sx={{
          width: { xs: '100%', lg: '55%' },
          px: { xs: 3, sm: 5, lg: 10 },
          py: { xs: 4, sm: 5 },
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: { xs: 5, sm: 7.5 } }}>
          <Box component="img" src={LOGIN_LOGO} alt="AVEC GLOBAL" sx={{ height: 35, width: 'auto', objectFit: 'contain' }} />
        </Box>

        <Box sx={{ maxWidth: 420, width: '100%', mx: 'auto', my: 'auto', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
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
              <Typography component="label" htmlFor="login-email" sx={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', mb: 0.75 }}>
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
                sx={fieldSx}
                slotProps={{
                  input: {
                    sx: { px: 1.875 },
                    autoComplete: 'email',
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography component="label" htmlFor="login-password" sx={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', mb: 0.75 }}>
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
                  ...fieldSx,
                  '& .MuiOutlinedInput-root.MuiInputBase-adornedEnd': {
                    paddingRight: 0,
                  },
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
                  sx={{
                    color: '#cbd5e1',
                    '&.Mui-checked': { color: '#2f80c9' },
                  }}
                />
              }
              label={<Typography sx={{ fontSize: '0.8125rem', color: '#334155' }}>Remember Me</Typography>}
              sx={{ mb: 2, ml: 0 }}
            />

            <Button
              type="submit"
              fullWidth
              disabled={submitting}
              sx={{
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
              }}
            >
              {submitting ? 'Signing in…' : 'Log In'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Link href="#" underline="none" sx={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 500 }}>
              Forgot Password?
            </Link>
          </Box>

          <Box sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', mt: 3 }}>
            <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>
              Business Management Platform
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            display: { xs: 'block', lg: 'none' },
            mt: 3,
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#94a3b8',
          }}
        >
          {COPYRIGHT}
        </Typography>
      </Box>

      {/* Right — hero card */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '45%',
          p: 2.5,
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, #5aa9e6, #2f80c9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 7.5,
            textAlign: 'center',
            position: 'relative',
            color: '#fff',
          }}
        >
          <Box sx={{ position: 'absolute', top: 35, left: 40, zIndex: 1 }}>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.95)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                bgcolor: 'rgba(255,255,255,0.15)',
                px: 1.5,
                py: 1,
                borderRadius: 2,
                backdropFilter: 'blur(6px)',
              }}
            >
              Business Management Platform
            </Typography>
          </Box>

          <Box
            component="img"
            src={LOGIN_HERO}
            alt="Team collaboration"
            sx={{
              width: '80%',
              maxWidth: 480,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))',
            }}
          />

          <Box sx={{ mt: 3.75, maxWidth: 450 }}>
            <Typography
              sx={{
                fontSize: { lg: '2rem', xl: '2rem' },
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Elevate Your Team&apos;s
              <br />
              Productivity &amp; Workflow.
            </Typography>
            <Typography sx={{ fontSize: '0.9375rem', mt: 1.875, opacity: 0.9, lineHeight: 1.6 }}>
              Access your personalized CRM dashboard to streamline tasks and manage your operations with ease.
            </Typography>
          </Box>

          <Typography
            sx={{
              position: 'absolute',
              bottom: 35,
              left: 40,
              right: 40,
              textAlign: 'center',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 500,
            }}
          >
            {COPYRIGHT}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}