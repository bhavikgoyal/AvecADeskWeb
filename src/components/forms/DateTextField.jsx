import TextField from '@mui/material/TextField';
import { toIsoDateString } from '../../utils/dateFormat';

export default function DateTextField({
  value,
  onChangeValue,
  inputProps,
  InputProps,
  slotProps,
  ...props
}) {
  const normalizedValue = toIsoDateString(value);

  return (
    <TextField
      {...props}
      type="date"
      value={normalizedValue}
      onChange={(event) => {
        onChangeValue(event.target.value || '');
      }}
      inputProps={{ lang: 'en-GB', ...inputProps }}
      InputProps={InputProps}
      slotProps={{
        ...slotProps,
        inputLabel: {
          ...slotProps?.inputLabel,
        },
        htmlInput: {
          lang: 'en-GB',
          ...slotProps?.htmlInput,
        },
      }}
    />
  );
}
