export const FORM_PAGE_MAX_WIDTH = '100%';

/** xs: 1 col | md: 2 cols | lg: 3 cols — full-width section */
export const defaultFieldGrid = { xs: 12, md: 6, lg: 4 };

/** xs: 1 col | md+: 2 cols — side-by-side section panel */
export const compactFieldGrid = { xs: 12, md: 6 };

/** Shared Select dropdown: ~5 rows visible, then scroll; capped width; opens below field */
export const SELECT_ITEM_HEIGHT = 36;
export const SELECT_MENU_MAX_ITEMS = 5;
export const SELECT_MENU_MAX_HEIGHT = SELECT_ITEM_HEIGHT * SELECT_MENU_MAX_ITEMS + 16; // 196

export const selectMenuProps = {
  disableScrollLock: true,
  keepMounted: false,
  marginThreshold: 8,
  // Prefer opening under the field (avoids huge menus flipping above)
  anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  transformOrigin: { vertical: 'top', horizontal: 'left' },
  // MUI v6+/v9 Select reads slotProps.paper (PaperProps is ignored)
  slotProps: {
    paper: {
      className: 'select-menu-paper',
      style: {
        maxHeight: SELECT_MENU_MAX_HEIGHT,
        // width: 0 + MUI's minWidth(select) => menu width always matches the input
        width: 0,
      },
      sx: {
        mt: 0.5,
        overflowX: 'hidden',
        overflowY: 'auto',
        borderRadius: 2,
        boxShadow: '0 8px 24px rgba(26, 43, 61, 0.14)',
        border: '1px solid var(--card-border)',
        '& .MuiList-root': { py: 0.5 },
        '& .MuiMenuItem-root': {
          fontSize: '0.875rem',
          fontWeight: 500,
          minHeight: `${SELECT_ITEM_HEIGHT}px !important`,
          maxHeight: SELECT_ITEM_HEIGHT,
          py: 0,
          px: 1.5,
          lineHeight: `${SELECT_ITEM_HEIGHT}px`,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
        },
      },
    },
  },
};

export const formPaperSx = {
  borderRadius: 2,
  p: { xs: 1.25, sm: 1.5, md: 1.75 },
  width: '100%',
  backgroundColor: '#fff',
  border: '1px solid var(--card-border)',
  boxShadow: '0 2px 12px rgba(26, 43, 61, 0.05)',
  display: 'flex',
  flexDirection: 'column',
  gap: 1.25,
};

export const formFieldSx = {
  width: '100%',
  minWidth: 0,
  '& .MuiOutlinedInput-root': {
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#f8fafc',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
    '&:hover': { backgroundColor: '#fff' },
    '&.Mui-focused': {
      backgroundColor: '#fff',
      boxShadow: '0 0 0 3px rgba(51, 133, 198, 0.12)',
    },
  },
  '& .MuiInputLabel-root': {
    fontWeight: 600,
    fontSize: '0.875rem',
    transition: 'none',
  },
  '& input[type="date"]': {
    minHeight: 40,
  },
  '& input[type="date"]::-webkit-datetime-edit': {
    lineHeight: 1.5,
  },
};

export const formActionsSx = {
  mt: 1.5,
  pt: 1.5,
  borderTop: '1px solid var(--muted-border)',
};

export const outlineButtonSx = {
  textTransform: 'none',
  minWidth: 110,
  height: 36,
  borderRadius: 2,
  fontWeight: 600,
  fontSize: '0.875rem',
  color: 'var(--text)',
  bgcolor: '#fff',
  borderColor: 'var(--card-border)',
  '&:hover': { borderColor: 'var(--primary)', bgcolor: 'var(--primary-soft)' },
};

export const primaryButtonSx = {
  textTransform: 'none',
  minWidth: 130,
  height: 36,
  borderRadius: 2,
  fontWeight: 600,
  fontSize: '0.875rem',
  bgcolor: 'var(--primary)',
  color: '#fff',
  boxShadow: '0 2px 8px rgba(51, 133, 198, 0.25)',
  '&:hover': { bgcolor: 'var(--primary-dark)', boxShadow: '0 4px 12px rgba(51, 133, 198, 0.32)' },
};
