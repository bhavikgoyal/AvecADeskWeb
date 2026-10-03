import { useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { registerStudent, verifyEmail } from "../../api/authApi";
import { Snackbar, Alert } from "@mui/material";
import LoginSplitLayout from "../../components/login/LoginSplitLayout";
import {
  loginButtonSx,
  loginFieldSx,
  loginLabelSx,
} from "../../components/login/loginFormStyles";

const passwordFieldSx = {
  ...loginFieldSx,
  "& .MuiOutlinedInput-root.MuiInputBase-adornedEnd": { paddingRight: 0 },
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
        type={showPassword ? "text" : "password"}
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  edge="end"
                  sx={{ color: "#94a3b8", mr: 0.5 }}
                >
                  {showPassword ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
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
    firstName: "",
    lastName: "",
    mobileNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [openVerificationDialog, setOpenVerificationDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const navigate = useNavigate();

  // const updateField = (field) => (e) => {
  //   setForm((prev) => ({ ...prev, [field]: e.target.value }));
  // };
const updateField = (field) => (e) => {
  if (field === "email") {
    setEmailError("");
  }

  setForm((prev) => ({
    ...prev,
    [field]: e.target.value,
  }));
};
  const handleSubmit = async (e) => {
    e.preventDefault();

    // First Name
    if (!form.firstName.trim()) {
      setSnackbar({
        open: true,
        message: "First name is required.",
        severity: "error",
      });
      return;
    }

    // Last Name
    if (!form.lastName.trim()) {
      setSnackbar({
        open: true,
        message: "Last name is required.",
        severity: "error",
      });
      return;
    }

    // Mobile Number
    if (!/^[0-9]{10}$/.test(form.mobileNumber)) {
      setSnackbar({
        open: true,
        message: "Please enter a valid 10-digit mobile number.",
        severity: "error",
      });
      return;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      setSnackbar({
        open: true,
        message: "Please enter a valid email address.",
        severity: "error",
      });
      return;
    }

    // Password
    if (form.password.length < 6) {
      setSnackbar({
        open: true,
        message: "Password must be at least 6 characters.",
        severity: "error",
      });
      return;
    }

    // Confirm Password
    if (form.password !== form.confirmPassword) {
      setSnackbar({
        open: true,
        message: "Password and Confirm Password do not match.",
        severity: "error",
      });
      return;
    }

    try {
      setRegisterLoading(true);
      const response = await registerStudent({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.mobileNumber,
        email: form.email,
        password: form.password,
      });

      console.log(response);

      if (response.success) {
        setRegisteredEmail(form.email);

        setForm({
          firstName: "",
          lastName: "",
          mobileNumber: "",
          email: "",
          password: "",
          confirmPassword: "",
        });

        setOpenVerificationDialog(true);
      }
    } catch (error) {
  console.log(error.response?.data);

  const data = error.response?.data;

  const message =
    data?.message ||
    data?.error ||
    data?.msg ||
    error.message ||
    "";

  if (message.toLowerCase().includes("email")) {
    setEmailError("Email already exists.");

    setSnackbar({
      open: true,
      message: "Email already exists.",
      severity: "warning",
    });

    return;
  }

  setSnackbar({
    open: true,
    message: message || "Registration failed.",
    severity: "error",
  });
}

     finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (verificationCode.length !== 6) {
      setSnackbar({
        open: true,
        message: "Please enter a valid 6-digit verification code.",
        severity: "error",
      });
      return;
    }

    try {
      setVerifyLoading(true);
      const response = await verifyEmail(registeredEmail, verificationCode);

      if (response.success) {
        setSnackbar({
          open: true,
          message: response.message,
          severity: "success",
        });

        setOpenVerificationDialog(false);

        setVerificationCode("");

        navigate("/student-login"); 
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Invalid code.",
        severity: "error",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <LoginSplitLayout>
      <Typography
        sx={{
          fontSize: { xs: "1.75rem", sm: "2.25rem" },
          fontWeight: 700,
          color: "#0f172a",
          mb: 1.5,
          lineHeight: 1.15,
        }}
      >
        Student Registration
      </Typography>
      <Typography
        sx={{ color: "#64748b", fontSize: "0.9375rem", mb: { xs: 3, sm: 4 } }}
      >
        Fill in your details to register as a student.
      </Typography>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: { xs: 2, sm: 2.5 },
            mb: { xs: 2, sm: 3 },
          }}
        >
          <Box>
            <Typography
              component="label"
              htmlFor="register-first-name"
              sx={loginLabelSx}
            >
              First Name
            </Typography>
            <TextField
              id="register-first-name"
              fullWidth
              name="firstName"
              autoComplete="given-name"
              placeholder="Enter your first name"
              value={form.firstName}
              onChange={updateField("firstName")}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 } } }}
            />
          </Box>

          <Box>
            <Typography
              component="label"
              htmlFor="register-last-name"
              sx={loginLabelSx}
            >
              Last Name
            </Typography>
            <TextField
              id="register-last-name"
              fullWidth
              name="lastName"
              autoComplete="family-name"
              placeholder="Enter your last name"
              value={form.lastName}
              onChange={updateField("lastName")}
              required
              sx={loginFieldSx}
              slotProps={{ input: { sx: { px: 1.875 } } }}
            />
          </Box>
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            component="label"
            htmlFor="register-mobile"
            sx={loginLabelSx}
          >
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
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
              setForm((prev) => ({
                ...prev,
                mobileNumber: value,
              }));
            }}
            inputProps={{
              maxLength: 10,
              inputMode: "numeric",
            }}
            required
            sx={loginFieldSx}
            slotProps={{ input: { sx: { px: 1.875 } } }}
          />
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            component="label"
            htmlFor="register-email"
            sx={loginLabelSx}
          >
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
  onChange={updateField("email")}
  error={!!emailError}
  helperText={emailError}
  required
  sx={loginFieldSx}
  slotProps={{
    input: {
      sx: { px: 1.875 },
    },
  }}
/>
        </Box>

        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <PasswordField
            id="register-password"
            label="Password"
            value={form.password}
            onChange={updateField("password")}
            autoComplete="new-password"
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <PasswordField
            id="register-confirm-password"
            label="Confirm Password"
            value={form.confirmPassword}
            onChange={updateField("confirmPassword")}
            autoComplete="new-password"
          />
        </Box>

        <Button
          type="submit"
          fullWidth
          disabled={registerLoading}
          sx={loginButtonSx}
        >
          {registerLoading ? "Registering..." : "Register"}
        </Button>
      </Box>

      <Box sx={{ textAlign: "center", mt: 3 }}>
        <Link
          component={RouterLink}
          to="/student-login"
          underline="none"
          sx={{ fontSize: "0.8125rem", color: "#2f80c9", fontWeight: 600 }}
        >
          Already have an account? Log In
        </Link>
      </Box>

      <Box
        sx={{
          display: { xs: "block", lg: "none" },
          textAlign: "center",
          mt: 3,
        }}
      >
        <Typography sx={{ fontSize: "0.875rem", color: "#64748b" }}>
          Business Management Platform
        </Typography>
      </Box>

      <Dialog open={openVerificationDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Verify Email</DialogTitle>

        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Enter the verification code sent to your email.
          </Typography>

          <TextField
            fullWidth
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setVerificationCode(value);
            }}
            inputProps={{
              maxLength: 6,
              inputMode: "numeric",
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pt: 1, pb: 3 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleVerifyEmail}
            disabled={verifyLoading || verificationCode.length !== 6}
            sx={{
              py: 1.5,
              width: "100%",
            }}
          >
            {verifyLoading ? "Verifying..." : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() =>
          setSnackbar((prev) => ({
            ...prev,
            open: false,
          }))
        }
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LoginSplitLayout>
  );
}
