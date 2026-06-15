import { Button, Stack } from '@mui/material';
import { formActionsSx, outlineButtonSx, primaryButtonSx } from './formStyles';

export default function FormActions({ onCancel, cancelLabel = 'Cancel', submitLabel, onSubmit, submitDisabled }) {
  return (
    <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent="flex-end" sx={formActionsSx}>
      <Button variant="outlined" onClick={onCancel} sx={{ ...outlineButtonSx, width: { xs: '100%', sm: 'auto' } }}>
        {cancelLabel}
      </Button>
      <Button
        variant="contained"
        disableElevation
        onClick={onSubmit}
        disabled={submitDisabled}
        sx={{ ...primaryButtonSx, width: { xs: '100%', sm: 'auto' } }}
      >
        {submitLabel}
      </Button>
    </Stack>
  );
}
