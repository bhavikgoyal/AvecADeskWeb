import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import { Avatar, Box, Button, IconButton, Popover, Typography } from '@mui/material';

function getDisplayName(user) {
    if (user?.name) {
        const segment = String(user.name).split(/[\s._-]/)[0];
        if (segment) return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    if (user?.email) {
        const segment = String(user.email).split('@')[0];
        if (segment) return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    return 'User';
}

function getInitials(user) {
    if (user?.name) {
        return user.name
            .split(' ')
            .map((part) => part[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }
    if (user?.email) {
        return user.email.charAt(0).toUpperCase();
    }
    return 'U';
}

export default function UserAccountMenu({ user, anchorEl, open, onClose, offsetY = 14 }) {
    const navigate = useNavigate();
    const displayName = useMemo(() => getDisplayName(user), [user]);
    const initials = useMemo(() => getInitials(user), [user]);

    const handleManageAccount = () => {
        onClose();
        navigate('/account');
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            disableScrollLock
            slotProps={{
                root: { sx: { zIndex: (theme) => theme.zIndex.modal + 2 } },
                paper: {
                    sx: {
                        width: { xs: 'min(360px, calc(100vw - 24px))', sm: 380 },
                        borderRadius: 4,
                        mt: `${offsetY}px`,
                        boxShadow: '0 12px 40px rgba(31, 50, 93, 0.2)',
                        border: '1px solid rgba(229, 232, 240, 0.95)',
                        overflow: 'hidden',
                        bgcolor: '#f8f9fb',
                    },
                },
            }}
        >
            <Box sx={{ position: 'relative', px: 2.5, pt: 2, pb: 3 }}>
                <IconButton
                    size="small"
                    aria-label="Close account menu"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        color: '#5c6b82',
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Typography
                    align="center"
                    sx={{
                        fontSize: '0.875rem',
                        color: '#5c6b82',
                        pt: 0.5,
                        pr: 4,
                        pl: 4,
                        wordBreak: 'break-word',
                    }}
                >
                    {user?.email || '—'}
                </Typography>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pt: 3,
                        pb: 1,
                    }}
                >
                    <Avatar
                        alt={user?.name || displayName}
                        src={user?.avatar}
                        sx={{
                            width: 80,
                            height: 80,
                            bgcolor: 'var(--primary)',
                            fontWeight: 700,
                            fontSize: '1.75rem',
                            border: '3px solid #fff',
                            boxShadow: '0 4px 16px rgba(31, 50, 93, 0.12)',
                        }}
                    >
                        {initials}
                    </Avatar>

                    <Typography
                        sx={{
                            mt: 2.5,
                            fontWeight: 500,
                            fontSize: { xs: '1.25rem', sm: '1.375rem' },
                            color: 'var(--text)',
                        }}
                    >
                        Hi, {displayName}!
                    </Typography>

                    <Button
                        variant="outlined"
                        onClick={handleManageAccount}
                        sx={{
                            mt: 2.5,
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.875rem',
                            color: 'var(--primary)',
                            borderColor: '#c8d3e3',
                            borderRadius: 99,
                            px: 3,
                            py: 0.85,
                            bgcolor: '#fff',
                            '&:hover': {
                                bgcolor: 'var(--primary-soft, #e8f2fb)',
                                borderColor: '#b8c9de',
                            },
                        }}
                    >
                        Manage your account
                    </Button>
                </Box>
            </Box>
        </Popover>
    );
}
