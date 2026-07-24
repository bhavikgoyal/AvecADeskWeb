import { Avatar, Box, Divider, Grid, Paper, Typography } from '@mui/material';
import TrendBadge from './TrendBadge';

export default function WelcomeCard({ userName = 'User', subtitle, avatar, footerStats = [] }) {
  return (
    <Paper elevation={0} className="dashboard-card welcome-card" sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: { xs: 1.5, md: 1.75 }, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Avatar
          src={avatar}
          alt={userName}
          sx={{
            width: 48,
            height: 48,
            border: '3px solid rgba(51, 133, 198, 0.2)',
            boxShadow: '0 8px 24px rgba(51, 133, 198, 0.2)',
            bgcolor: 'var(--primary)',
            fontWeight: 700,
            fontSize: '1rem',
          }}
        >
          {userName?.[0]}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 1, textTransform: 'uppercase', mb: 0.5 }}>
            {/* Overview */}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.15rem', md: '1.35rem' }, color: 'var(--text)', lineHeight: 1.2 }}>
            Welcome back, {userName.split(' ')[0]}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--muted)', mt: 0.5, lineHeight: 1.5, fontSize: '0.82rem' }}>
            {subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'block' },
            width: 88,
            height: 64,
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(51,133,198,0.12) 0%, rgba(32,201,151,0.12) 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              right: -10,
              bottom: -10,
              width: 70,
              height: 70,
              borderRadius: '50%',
              bgcolor: 'rgba(51, 133, 198, 0.15)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              top: 20,
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'var(--primary)',
              opacity: 0.85,
            }}
          />
        </Box>
      </Box>

      {footerStats.length > 0 && (
        <>
          <Divider />
          <Grid container sx={{ width: '100%' }}>
            {footerStats.map((stat, index) => (
              <Grid
                key={stat.label}
                size={{ xs: 6 }}
                sx={{
                  p: 1.25,
                  borderRight: index % 2 === 0 ? '1px solid var(--card-border)' : 'none',
                }}
              >
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {stat.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Box sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    display: 'inline-block',
                    bgcolor: stat.label === 'Received' ? 'rgba(32,201,151,0.12)' : stat.label === 'Due' ? 'rgba(214,57,57,0.08)' : 'transparent'
                  }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', color: stat.label === 'Received' ? 'var(--success)' : stat.label === 'Due' ? 'var(--danger)' : 'var(--text)' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  {stat.trend !== undefined && <TrendBadge value={stat.trend} />}
                </Box>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Paper>
  );
}
