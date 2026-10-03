import { useMediaQuery, useTheme } from '@mui/material';
import { SIDEBAR_COLLAPSE_BREAKPOINT } from '../constants/layout';

export default function useCompactSidebar() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down(SIDEBAR_COLLAPSE_BREAKPOINT));
}
