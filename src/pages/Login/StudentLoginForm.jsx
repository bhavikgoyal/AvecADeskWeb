import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';
import { studentLoginWithApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

export default function StudentLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const STUDENT_PORTAL_URL = import.meta.env.VITE_STUDENT_PORTAL_URL || 'http://localhost:5173';


  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setSubmitting(true);

  try {
    const apiStudent = await studentLoginWithApi(email, password);

    const params = new URLSearchParams({
      token: apiStudent.token,
      studentId: apiStudent.id,
      email: apiStudent.email,
      firstName: apiStudent.firstName,
      lastName: apiStudent.lastName,
    });

    window.location.href = `${STUDENT_PORTAL_URL}/colleges?${params.toString()}`;
  } catch (err) {
    setError(
      err.message === 'Request failed'
        ? 'Cannot reach AvecADeskApi. Make sure the API is running and try again.'
        : err.message || 'Invalid email or password.',
    );
    setSubmitting(false);
  }
};
  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Student Login
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 4.5 }}>
        Enter your details to access your student dashboard.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: 3 }}>
          <Typography component="label" htmlFor="student-login-email" sx={loginLabelSx}>
            Email Address
          </Typography>
          <TextField
            id="student-login-email"
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
          <Typography component="label" htmlFor="student-login-password" sx={loginLabelSx}>
            Password
          </Typography>
          <TextField
            id="student-login-password"
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

        <Button type="submit" fullWidth disabled={submitting} sx={{ ...loginButtonSx, mt: 1 }}>
          {submitting ? 'Signing in…' : 'Log In'}
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink}
          to="/register"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          Don't have an account? Register
        </Link>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 1.5 }}>
        <Link
          component={RouterLink}
          to="/login"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          Not a student? Log in here
        </Link>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', mt: 3 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Business Management Platform</Typography>
      </Box>
    </LoginSplitLayout>
  );
}