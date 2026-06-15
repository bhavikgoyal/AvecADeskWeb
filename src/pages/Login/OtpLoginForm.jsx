import { useState } from 'react';
import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';

const DEMO_OTP = '123456';

function normalizePhone(value) {
  return value.replace(/\D/g, '');
}

export default function OtpLoginForm() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = (e) => {
    e.preventDefault();
    const digits = normalizePhone(phone);

    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setInfo('');
      return;
    }

    setError('');
    setOtpSent(true);
    setInfo(`OTP sent to +${digits.length > 10 ? digits.slice(-10) : digits}. Use ${DEMO_OTP} to verify.`);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    if (otp.trim() !== DEMO_OTP) {
      setError('Invalid OTP. Please try again.');
      return;
    }

    setError('');
    navigate('/user-portal', { replace: true });
  };

  const handleSubmit = otpSent ? handleVerifyOtp : handleSendOtp;

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Phone Verification
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 4.5 }}>
        {otpSent
          ? 'Enter the OTP sent to your mobile number to continue.'
          : 'Enter your phone number to receive a one-time password.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {info && !error && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          {info}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box sx={{ mb: otpSent ? 2.5 : 3 }}>
          <Typography component="label" htmlFor="otp-phone" sx={loginLabelSx}>
            Phone Number
          </Typography>
          <TextField
            id="otp-phone"
            fullWidth
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={otpSent}
            required
            sx={loginFieldSx}
            slotProps={{ input: { sx: { px: 1.875 } } }}
          />
        </Box>

        {otpSent && (
          <Box sx={{ mb: 3 }}>
            <Typography component="label" htmlFor="otp-code" sx={loginLabelSx}>
              OTP
            </Typography>
            <TextField
              id="otp-code"
              fullWidth
              type="text"
              inputMode="numeric"
              name="otp"
              autoComplete="one-time-code"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875, letterSpacing: 4 } } }}
            />
          </Box>
        )}

        <Button type="submit" fullWidth sx={loginButtonSx}>
          {otpSent ? 'Verify' : 'Send OTP'}
        </Button>
      </Box>

      {otpSent && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link
            component="button"
            type="button"
            underline="none"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setInfo('');
              setError('');
            }}
            sx={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 500, cursor: 'pointer', border: 'none', bgcolor: 'transparent' }}
          >
            Change phone number
          </Link>
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink}
          to="/login"
          underline="none"
          sx={{ fontSize: '0.8125rem', color: '#3b82f6', fontWeight: 500 }}
        >
          Back to Staff Login
        </Link>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', mt: 3 }}>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748b' }}>Business Management Platform</Typography>
      </Box>
    </LoginSplitLayout>
  );
}
