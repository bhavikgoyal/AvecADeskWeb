import { Box, Typography } from '@mui/material';
import { LOGIN_COPYRIGHT, LOGIN_HERO, LOGIN_LOGO } from './loginFormStyles';
import '../../styles/LoginForm.css';

export default function LoginSplitLayout({ children }) {
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

        <Box
          sx={{
            maxWidth: 420,
            width: '100%',
            mx: 'auto',
            my: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
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
          {LOGIN_COPYRIGHT}
        </Typography>
      </Box>

      <Box sx={{ display: { xs: 'none', lg: 'flex' }, width: '45%', p: 2.5 }}>
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
            sx={{ width: '80%', maxWidth: 480, filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}
          />

          <Box sx={{ mt: 3.75, maxWidth: 450 }}>
            <Typography sx={{ fontSize: { lg: '2rem', xl: '2rem' }, fontWeight: 700, lineHeight: 1.2 }}>
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
            {LOGIN_COPYRIGHT}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
