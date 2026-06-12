import { Box, Typography } from '@mui/material';
import logo1 from '../assets/logo-1.png';
import logo2 from '../assets/logo-2.png';

const SIZE_MAP = {
  sm: { logo1: 30, logo2: 28, desk: '1.3rem' },
  md: { logo1: 30, logo2: 28, desk: '1.4rem' },
  lg: { logo1: 46, logo2: 44, desk: '1.85rem' },
};

export default function BrandLogo({ size = 'md', showDesk = true, sx = {} }) {
  const s = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, ...sx }}>
      <Box
        component="img"
        src={logo1}
        alt="AVECA"
        sx={{ height: s.logo1, width: 'auto', objectFit: 'contain', flexShrink: 0, display: 'block' }}
      />
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0, flexShrink: 0, lineHeight: 0 }}>
        <Box
          component="img"
          src={logo2}
          alt=""
          sx={{ height: s.logo2, width: 'auto', objectFit: 'contain', display: 'block', mr: '-1px' }}
        />
        {showDesk && (
          <Typography
            noWrap
            component="span"
            sx={{
              fontWeight: 800,
              fontSize: s.desk,
              lineHeight: 1,
              letterSpacing: -0.3,
              ml: 0,
              background: 'linear-gradient(90deg, #2F80ED 0%, #59C6E9 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Desk
          </Typography>
        )}
      </Box>
    </Box>
  );
}
