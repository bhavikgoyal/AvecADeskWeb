import { createTheme } from '@mui/material/styles';

export const FONT_FAMILY =
  "'Plus Jakarta Sans', Inter, Roboto, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const muiTheme = createTheme({
  typography: {
    fontFamily: FONT_FAMILY,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: FONT_FAMILY,
        },
      },
    },
  },
});

export default muiTheme;
