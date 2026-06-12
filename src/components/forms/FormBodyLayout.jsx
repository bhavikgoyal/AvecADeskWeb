import { Grid } from '@mui/material';
import FormSummaryAside from './FormSummaryAside';

export default function FormBodyLayout({ resource, form, children }) {
  return (
    <Grid container spacing={{ xs: 2.5, md: 3 }} alignItems="flex-start">
      <Grid size={{ xs: 12, lg: 4 }}>
        <FormSummaryAside resource={resource} form={form} />
      </Grid>
      <Grid size={{ xs: 12, lg: 8 }}>
        {children}
      </Grid>
    </Grid>
  );
}
