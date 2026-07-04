import { useState } from 'react';
import {
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

const passwordFieldSx = {
  ...loginFieldSx,
  '& .MuiOutlinedInput-root.MuiInputBase-adornedEnd': { paddingRight: 0 },
};

function PasswordField({ id, label, value, onChange, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={loginLabelSx}>
        {label}
      </Typography>
      <TextField
        id={id}
        fullWidth
        type={showPassword ? 'text' : 'password'}
        name={id}
        autoComplete={autoComplete}
        placeholder={`Enter your ${label.toLowerCase()}`}
        value={value}
        onChange={onChange}
        required
        sx={passwordFieldSx}
        slotProps={{
          input: {
            sx: { px: 1.875 },
            autoComplete,
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
  );
}

export default function RegisterForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Student Registration
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: { xs: 3, sm: 4 } }}>
        Fill in your details to register as a student.
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 2, sm: 2.5 },
            mb: { xs: 2, sm: 3 },
          }}
        >
          <Box>
            <Typography component="label" htmlFor="register-first-name" sx={loginLabelSx}>
              First Name
            </Typography>
            <TextField
              id="register-first-name"
              fullWidth
              name="firstName"
              autoComplete="given-name"
              placeholder="Enter your first name"
              value={form.firstName}
              onChange={updateField('firstName')}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 } } }}
            />
          </Box>

          <Box>
            <Typography component="label" htmlFor="register-last-name" sx={loginLabelSx}>
              Last Name
            </Typography>
            <TextField
              id="register-last-name"
              fullWidth
              name="lastName"
              autoComplete="family-name"
              placeholder="Enter your last name"
              value={form.lastName}
              onChange={updateField('lastName')}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 } } }}
            />
          </Box>
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography component="label" htmlFor="register-mobile" sx={loginLabelSx}>
            Mobile Number
          </Typography>
          <TextField
            id="register-mobile"
            fullWidth
            type="tel"
            name="mobileNumber"
            autoComplete="tel"
            placeholder="Enter your mobile number"
            value={form.mobileNumber}
            onChange={updateField('mobileNumber')}
            required
            sx={loginFieldSx}
            slotProps={{ input: { sx: { px: 1.875 } } }}
          />
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography component="label" htmlFor="register-email" sx={loginLabelSx}>
            Email Address
          </Typography>
          <TextField
            id="register-email"
            fullWidth
            type="email"
            name="email"
            autoComplete="email"
            placeholder="Enter your email address"
            value={form.email}
            onChange={updateField('email')}
            required
            sx={loginFieldSx}
            slotProps={{ input: { sx: { px: 1.875 } } }}
          />
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <PasswordField
            id="register-password"
            label="Password"
            value={form.password}
            onChange={updateField('password')}
            autoComplete="new-password"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <PasswordField
            id="register-confirm-password"
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={updateField('confirmPassword')}
            autoComplete="new-password"
          />
        </Box>

        <Button type="submit" fullWidth sx={loginButtonSx}>
          Register
        </Button>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink}
          to="/login"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#2f80c9', fontWeight: 600 }}
        >
          Already have an account? Log In
        </Link>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', mt: 3 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Business Management Platform</Typography>
      </Box>
    </LoginSplitLayout>
  );
}
