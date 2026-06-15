import { Grid } from '@mui/material';
import FormSection from './FormSection';
import ResourceFormFields from './ResourceFormFields';

/**
 * Assign grid size per section based on total section count.
 * 1 → full | 2 → 1-1 | 3 → 2 top + 1 full bottom | 4 → 2×2 | 5+ → pairs + last full
 */
export function assignSectionLayouts(sections) {
  const n = sections.length;

  return sections.map((section, index) => {
    if (section.layout === 'full') {
      return { section, size: { xs: 12 }, compact: false, stretch: true };
    }
    if (section.layout === 'half') {
      return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
    }

    if (n === 1) {
      return { section, size: { xs: 12 }, compact: false, stretch: true };
    }

    if (n === 2) {
      return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
    }

    if (n === 3) {
      if (index < 2) {
        return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
      }
      return { section, size: { xs: 12 }, compact: false, stretch: true };
    }

    if (n === 4) {
      return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
    }

    if (n === 5) {
      if (index < 4) {
        return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
      }
      return { section, size: { xs: 12 }, compact: false, stretch: true };
    }

    const isLastAlone = n % 2 === 1 && index === n - 1;
    if (isLastAlone) {
      return { section, size: { xs: 12 }, compact: false, stretch: true };
    }
    return { section, size: { xs: 12, md: 6 }, compact: true, stretch: false };
  });
}

export default function FormSectionsLayout({ sections = [], form, onChange, disabled = false, selectOptions = {} }) {
  const layouts = assignSectionLayouts(sections);

  return (
    <Grid container spacing={{ xs: 1.25, md: 1.5 }} sx={{ width: '100%', m: 0, alignItems: 'stretch' }}>
      {layouts.map(({ section, size, compact, stretch }) => (
        <Grid
          key={section.title}
          size={size}
          sx={{
            display: 'flex',
            minWidth: 0,
            ...(stretch ? { minHeight: { md: 160 } } : {}),
          }}
        >
          <FormSection
            title={section.title}
            description={section.description}
            divider={false}
            fill
            stretch={stretch}
          >
            <ResourceFormFields
              sections={[section]}
              form={form}
              onChange={onChange}
              disabled={disabled}
              compact={compact}
              stretch={stretch}
              selectOptions={selectOptions}
            />
          </FormSection>
        </Grid>
      ))}
    </Grid>
  );
}
