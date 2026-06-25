import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Paper,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { formFieldSx, formPaperSx, outlineButtonSx, primaryButtonSx } from '../../components/forms/formStyles';
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

export default function ManageAccountPage() {

    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
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
            debugger;
            const userId = Session.getUserId();
            const response = await changePassword({
                userId: userId,
                oldPassword: form.currentPassword,
                newPassword: form.newPassword,
            });

            alert(response.message || "Password changed successfully");

            setForm(initialForm);
            setErrors({});
        } catch (error) {
            alert(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to change password"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                py: { xs: 1, sm: 2 },
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    ...formPaperSx,
                    width: '100%',
                    maxWidth: 460,
                    p: { xs: 2.5, sm: 3.5 },
                    gap: 0,
                }}
            >
                <Typography
                    align="center"
                    sx={{
                        fontWeight: 700,
                        fontSize: { xs: '1.05rem', sm: '1.125rem' },
                        color: 'var(--text)',
                        mb: { xs: 2.5, sm: 3 },
                    }}
                >
                    Create a New Password
                </Typography>

                <Box component="form" onSubmit={handleSubmit} noValidate>
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
                                    type="password"
                                    value={form[field.name]}
                                    onChange={handleChange}
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                    autoComplete={
                                        field.name === 'currentPassword'
                                            ? 'current-password'
                                            : 'new-password'
                                    }
                                    error={Boolean(errors[field.name])}
                                    helperText={errors[field.name] || ' '}
                                    size="small"
                                    fullWidth
                                    sx={formFieldSx}
                                />
                            </Box>
                        ))}

                        <Stack
                            direction={{ xs: 'column-reverse', sm: 'row' }}
                            spacing={1.5}
                            sx={{ pt: 1.5 }}
                        >
                            <Button
                                type="button"
                                variant="outlined"
                                onClick={handleCancel}
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
                                }}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </Button>
                        </Stack>
                    </Stack>
                </Box>
            </Paper>
        </Box>
    );
}
