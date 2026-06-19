import { useState } from 'react';
import { Alert, Box, Button, Link, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import LoginSplitLayout from '../../components/login/LoginSplitLayout';
import { loginButtonSx, loginFieldSx, loginLabelSx } from '../../components/login/loginFormStyles';
import { sendOtp, vendorLoginWithApi, verifyOtpWithApi } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const LOGIN_MODES = {
  PHONE: 'phone',
  VENDOR: 'vendor',
};

function normalizePhone(value) {
  return value.replace(/\D/g, '');
}

function formatApiError(err) {
  if (err.message === 'Request failed') {
    return 'Cannot reach AvecADeskApi. Make sure the API is running on https://localhost:7099 and try again.';
  }
  return err.message || 'Something went wrong. Please try again.';
}

export default function OtpLoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginMode, setLoginMode] = useState(LOGIN_MODES.PHONE);
  const [phone, setPhone] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const handleModeChange = (_, nextMode) => {
    if (!nextMode) return;
    setLoginMode(nextMode);
    setOtpSent(false);
    setOtp('');
    setPhone('');
    setVendorCode('');
    resetMessages();
  };

  const completeLogin = (apiUser) => {
    login(apiUser);
    navigate('/user-portal', { replace: true });
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const digits = normalizePhone(phone);

    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      setInfo('');
      return;
    }

    setSubmitting(true);
    resetMessages();

    try {
      const response = await sendOtp(digits);
      setOtpSent(true);
      setInfo(response?.message || 'OTP sent to your mobile number.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const digits = normalizePhone(phone);

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }

    setSubmitting(true);
    resetMessages();

    try {
      const apiUser = await verifyOtpWithApi(digits, otp.trim());
      completeLogin(apiUser);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVendorLogin = async (e) => {
    e.preventDefault();
    const code = vendorCode.trim();

    if (!code) {
      setError('Please enter your vendor code.');
      return;
    }

    setSubmitting(true);
    resetMessages();

    try {
      const apiUser = await vendorLoginWithApi(code);
      completeLogin(apiUser);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isPhoneMode = loginMode === LOGIN_MODES.PHONE;
  const handleSubmit = isPhoneMode
    ? (otpSent ? handleVerifyOtp : handleSendOtp)
    : handleVendorLogin;

  return (
    <LoginSplitLayout>
      <Typography sx={{ fontSize: { xs: '1.75rem', sm: '3rem' }, fontWeight: 700, color: '#0f172a', mb: 1.5, lineHeight: 1.15 }}>
        Phone Verification
      </Typography>
      <Typography sx={{ color: '#64748b', fontSize: '0.9375rem', mb: 3 }}>
        {isPhoneMode
          ? otpSent
            ? 'Enter the OTP sent to your mobile number to continue.'
            : 'Enter your phone number to receive a one-time password.'
          : 'Enter your vendor code to access the user portal.'}
      </Typography>

      <ToggleButtonGroup
        exclusive
        fullWidth
        value={loginMode}
        onChange={handleModeChange}
        sx={{
          mb: 3,
          bgcolor: '#f1f5f9',
          borderRadius: '10px',
          p: 0.5,
          '& .MuiToggleButton-root': {
            flex: 1,
            border: 'none',
            borderRadius: '8px !important',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: '#64748b',
            py: 1,
            '&.Mui-selected': {
              bgcolor: '#fff',
              color: '#2f80c9',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
              '&:hover': { bgcolor: '#fff' },
            },
          },
        }}
      >
        <ToggleButton value={LOGIN_MODES.PHONE}>Mobile Number</ToggleButton>
        <ToggleButton value={LOGIN_MODES.VENDOR}>Vendor Code</ToggleButton>
      </ToggleButtonGroup>

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
        {isPhoneMode ? (
          <>
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
                disabled={otpSent || submitting}
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
                  disabled={submitting}
                  required
                  sx={loginFieldSx}
                  slotProps={{ input: { sx: { px: 1.875, letterSpacing: 4 } } }}
                />
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ mb: 3 }}>
            <Typography component="label" htmlFor="vendor-code" sx={loginLabelSx}>
              Vendor Code
            </Typography>
            <TextField
              id="vendor-code"
              fullWidth
              type="text"
              name="vendorCode"
              autoComplete="off"
              placeholder="Enter your vendor code"
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value)}
              disabled={submitting}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 } } }}
            />
          </Box>
        )}

        <Button type="submit" fullWidth disabled={submitting} sx={loginButtonSx}>
          {submitting
            ? 'Please wait…'
            : isPhoneMode
              ? (otpSent ? 'Verify' : 'Send OTP')
              : 'Log In'}
        </Button>
      </Box>

      {isPhoneMode && otpSent && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Link
            component="button"
            type="button"
            underline="none"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              resetMessages();
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
