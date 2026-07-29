import { createTheme } from '@mui/material/styles';

export const FONT_FAMILY =
  "'Plus Jakarta Sans', Inter, Roboto, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

/** Shared size for all API/table data cells across the app */
export const DATA_FONT_SIZE = '0.8125rem';
export const DATA_FONT_WEIGHT = 400;
export const DATA_HEADER_FONT_WEIGHT = 700;

const muiTheme = createTheme({
  typography: {
    fontFamily: FONT_FAMILY,
    body2: {
      fontSize: DATA_FONT_SIZE,
      lineHeight: 1.45,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: FONT_FAMILY,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY,
          fontSize: `${DATA_FONT_SIZE} !important`,
          lineHeight: 1.45,
        },
        head: {
          fontSize: `${DATA_FONT_SIZE} !important`,
          fontWeight: DATA_HEADER_FONT_WEIGHT,
        },
        body: {
          fontSize: `${DATA_FONT_SIZE} !important`,
          fontWeight: DATA_FONT_WEIGHT,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body2: {
          fontSize: DATA_FONT_SIZE,
          lineHeight: 1.45,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontSize: 'inherit',
        },
      },
    },
  },
});

export default muiTheme;
