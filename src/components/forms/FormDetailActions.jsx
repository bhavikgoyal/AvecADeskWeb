import { Button } from '@mui/material';
import { outlineButtonSx, primaryButtonSx } from './formStyles';

export function FormBackButton({ onClick, label = 'Back' }) {
  return (
    <Button variant="outlined" onClick={onClick} sx={{ ...outlineButtonSx, width: { xs: '100%', sm: 'auto' } }}>
      {label}
    </Button>
  );
}

export function FormSaveButton({ onClick, editMode, saveLabel = 'Save', editLabel = 'Edit' }) {
  return (
    <Button variant="contained" disableElevation onClick={onClick} sx={{ ...primaryButtonSx, width: { xs: '100%', sm: 'auto' } }}>
      {editMode ? saveLabel : editLabel}
    </Button>
  );
}
