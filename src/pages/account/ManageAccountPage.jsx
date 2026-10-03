import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
    Box,
    Button,
    CircularProgress,
    IconButton,
    InputAdornment,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { formFieldSx, outlineButtonSx, primaryButtonSx } from '../../components/forms/formStyles';
import { changePassword } from '../../api/userApi';
import { Session } from '../../utils/session';

const passwordFields = [
    { name: 'currentPassword', label: 'Current Password', required: true },
    { name: 'newPassword', label: 'New Password', required: false },
    { name: 'confirmPassword', label: 'Confirm Password', required: false },
];

const initialForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
};

const initialVisibility = {
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
};

/** Hides the browser's built-in password reveal (Edge/Chrome on Windows). */
const hideNativePasswordRevealSx = {
    '& input[type="password"]::-ms-reveal': {
        display: 'none',
    },
    '& input[type="password"]::-ms-clear': {
        display: 'none',
    },
    '& input::-webkit-credentials-auto-fill-button': {
        display: 'none !important',
        visibility: 'hidden',
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
    },
    '& input::-webkit-strong-password-auto-fill-button': {
        display: 'none !important',
        visibility: 'hidden',
        pointerEvents: 'none',
    },
};

export default function ManageAccountPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(initialVisibility);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const togglePasswordVisibility = (fieldName) => {
        setShowPassword((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
    };

    const validate = () => {
        const nextErrors = {};

        if (!form.currentPassword.trim()) nextErrors.currentPassword = 'Current password is required';
        if (!form.newPassword.trim()) nextErrors.newPassword = 'New password is required';
        else if (form.newPassword.length < 6) {
            nextErrors.newPassword = 'New password must be at least 6 characters';
        }
        if (!form.confirmPassword.trim()) {
            nextErrors.confirmPassword = 'Please confirm your new password';
        } else if (form.newPassword !== form.confirmPassword) {
            nextErrors.confirmPassword = 'Passwords do not match';
        }
        if (form.currentPassword && form.newPassword && form.currentPassword === form.newPassword) {
            nextErrors.newPassword = 'New password must be different from current password';
        }

        return nextErrors;
    };

    const handleCancel = () => {
        setForm(initialForm);
        setErrors({});
        setShowPassword(initialVisibility);
        navigate(-1);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        try {
            setLoading(true);
            const userId = Session.getUserId();
            const response = await changePassword({
                userId: userId,
                oldPassword: form.currentPassword,
                newPassword: form.newPassword,
            });

            toast.success(response.message || 'Password changed successfully');

            setForm(initialForm);
            setErrors({});
            setShowPassword(initialVisibility);
        } catch (error) {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to change password',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                minHeight: { xs: 'calc(100dvh - 112px)', sm: 'calc(100dvh - 96px)' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                px: { xs: 1.5, sm: 2, md: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: 'border-box',
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: '100%',
                    maxWidth: { xs: '100%', sm: 520, md: 600 },
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid var(--card-border)',
                    bgcolor: 'var(--card-bg)',
                    boxShadow: '0 8px 32px rgba(26, 43, 61, 0.08)',
                }}
            >
                <Box
                    sx={{
                        px: { xs: 2.5, sm: 3 },
                        py: { xs: 2, sm: 2.5 },
                        bgcolor: 'var(--primary-soft, #e8f2fb)',
                        borderBottom: '1px solid var(--card-border)',
                        textAlign: 'center',
                    }}
                >
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            bgcolor: '#fff',
                            border: '1px solid var(--card-border)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.25,
                            color: 'var(--primary)',
                        }}
                    >
                        <LockOutlinedIcon />
                    </Box>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: '1.125rem', sm: '1.25rem' },
                            color: 'var(--text)',
                            lineHeight: 1.3,
                        }}
                    >
                        Create a New Password
                    </Typography>
                    <Typography
                        sx={{
                            mt: 0.75,
                            fontSize: '0.875rem',
                            color: 'var(--muted)',
                            lineHeight: 1.5,
                        }}
                    >
                        Keep your account secure with a strong, unique password.
                    </Typography>
                </Box>

                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    autoComplete="off"
                    sx={{ px: { xs: 2.5, sm: 3.5 }, py: { xs: 2.5, sm: 3 } }}
                >
                    <Stack spacing={2.25}>
                        {passwordFields.map((field) => (
                            <Box key={field.name}>
                                <Typography
                                    component="label"
                                    htmlFor={field.name}
                                    sx={{
                                        display: 'block',
                                        mb: 0.75,
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        color: 'var(--text)',
                                    }}
                                >
                                    {field.label}
                                    {field.required && (
                                        <Box component="span" sx={{ color: 'var(--danger, #d63939)', ml: 0.25 }}>
                                            *
                                        </Box>
                                    )}
                                </Typography>
                                <TextField
                                    id={field.name}
                                    name={field.name}
                                    type={showPassword[field.name] ? 'text' : 'password'}
                                    value={form[field.name]}
                                    onChange={handleChange}
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                    error={Boolean(errors[field.name])}
                                    helperText={errors[field.name] || ''}
                                    FormHelperTextProps={{
                                        sx: {
                                            minHeight: errors[field.name] ? '1.25rem' : 0,
                                            m: 0,
                                            mt: errors[field.name] ? 0.5 : 0,
                                        },
                                    }}
                                    size="small"
                                    fullWidth
                                    sx={{
                                        ...formFieldSx,
                                        ...hideNativePasswordRevealSx,
                                        '& .MuiOutlinedInput-root': {
                                            ...formFieldSx['& .MuiOutlinedInput-root'],
                                            pr: 0.5,
                                        },
                                        '& .MuiOutlinedInput-root.MuiInputBase-adornedEnd': {
                                            paddingRight: 0,
                                        },
                                    }}
                                    slotProps={{
                                        input: {
                                            autoComplete: 'off',
                                            endAdornment: (
                                                <InputAdornment position="end" sx={{ ml: 0 }}>
                                                    <IconButton
                                                        type="button"
                                                        aria-label={showPassword[field.name] ? 'Hide password' : 'Show password'}
                                                        onMouseDown={(event) => event.preventDefault()}
                                                        onClick={() => togglePasswordVisibility(field.name)}
                                                        edge="end"
                                                        size="small"
                                                        sx={{
                                                            color: '#94a3b8',
                                                            mr: 0.25,
                                                            flexShrink: 0,
                                                            '&:hover': { color: 'var(--primary)', bgcolor: 'transparent' },
                                                        }}
                                                    >
                                                        {showPassword[field.name] ? (
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
                        ))}

                        <Stack
                            direction={{ xs: 'column-reverse', sm: 'row' }}
                            spacing={1.5}
                            sx={{ pt: 1 }}
                        >
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={handleCancel}
                                disabled={loading}
                                sx={{
                                    ...outlineButtonSx,
                                    flex: 1,
                                    height: 42,
                                    width: { xs: '100%', sm: 'auto' },
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                disableElevation
                                disabled={loading}
                                sx={{
                                    ...primaryButtonSx,
                                    flex: 1,
                                    height: 42,
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: 0,
                                }}
                            >
                                {loading ? (
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                        <CircularProgress size={18} sx={{ color: '#fff' }} />
                                        Updating...
                                    </Box>
                                ) : (
                                    'Update Password'
                                )}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}
