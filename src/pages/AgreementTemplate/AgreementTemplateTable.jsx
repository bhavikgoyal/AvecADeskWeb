import { useMemo } from 'react';
import { Link , useNavigate} from 'react-router-dom';
import {
  Box,
  Card,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
//import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ResponsiveTable from '../../components/ResponsiveTable';

const sectionCardSx = {
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  border: '1px solid var(--card-border)',
  bgcolor: 'var(--card-bg)',
  borderRadius: 2,
  boxShadow: '0 4px 16px rgba(26, 43, 61, 0.05)',
};

const contentInset = { xs: 1.5, sm: 2 };

const scrollContainerSx = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(47, 128, 201, 0.55) rgba(0,0,0,0.06)',
  '&::-webkit-scrollbar': { height: 10 },
  '&::-webkit-scrollbar-track': {
    bgcolor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 5,
    backgroundColor: 'rgba(47, 128, 201, 0.45)',
    '&:hover': {
      backgroundColor: 'rgba(47, 128, 201, 0.65)',
    },
  },
};

const tableAlignSx = {
  '& .MuiTableCell-root:first-of-type': {
    pl: contentInset,
  },
  '& .MuiTableCell-root:last-of-type': {
    pr: contentInset,
  },
};

const TABLE_MIN_WIDTH = 1080;

const rollColSx = { width: 56, minWidth: 56, maxWidth: 56, whiteSpace: 'nowrap' };
const nameColSx = { minWidth: 160, overflow: 'hidden' };
const categoryColSx = { minWidth: 120, whiteSpace: 'nowrap' };
const previewColSx = { minWidth: 240, maxWidth: 360, overflow: 'hidden' };
const dateColSx = { minWidth: 110, whiteSpace: 'nowrap' };
const createdByColSx = { minWidth: 100, whiteSpace: 'nowrap' };
const activeColSx = { width: 80, minWidth: 80, maxWidth: 80, textAlign: 'center' };
const actionColSx = { width: 148, minWidth: 148, maxWidth: 148, whiteSpace: 'nowrap' };

const agreementTableSx = {
  width: '100%',
  ...scrollContainerSx,
  ...tableAlignSx,
  pb: 0.5,
  '& table': {
    width: '100%',
    minWidth: TABLE_MIN_WIDTH,
    tableLayout: 'fixed',
  },
  '& .MuiTableCell-root': {
    verticalAlign: 'middle',
  },
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function TruncateCell({ value, fontWeight = 400 }) {
  const text = value ?? '';
  return (
    <Typography
      variant="body2"
      component="span"
      title={text}
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        color: 'var(--text)',
        fontWeight,
      }}
    >
      {text || '—'}
    </Typography>
  );
}

function PreviewCell({ value }) {
  const text = value || 'No content';
  return (
    <Typography
      variant="body2"
      component="span"
      title={text}
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        color: 'var(--muted)',
      }}
    >
      {text}
    </Typography>
  );
}

function TemplateActions({ templateId, onDelete }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: { xs: 0.5, sm: 0.75 },
        width: '100%',
      }}
    >
      <IconButton
        component={Link}
        to={`/agreement-template/${templateId}/view`}
        size="small"
        aria-label="View template"
        onClick={(event) => event.stopPropagation()} 
        sx={{
          color: 'var(--primary)',
          bgcolor: 'var(--primary-soft, #e8f2fb)',
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(47, 128, 201, 0.18)' },
        }}
      >
               <VisibilityOutlinedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        aria-label="Delete template"
        onClick={(event) => {
          event.stopPropagation();
          onDelete?.(templateId);
        }}
        sx={{
          color: 'var(--danger, #d63939)',
          bgcolor: 'rgba(214, 57, 57, 0.08)',
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(214, 57, 57, 0.14)' },
        }}
      >
        <DeleteOutlinedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default function AgreementTemplateTable({ templates = [], onDelete, loading = false }) {
   const navigate = useNavigate();
  const tableRows = useMemo(
    () =>
      templates.map((t, index) => ({
        ...t,
        roll: index + 1,
        preview: stripHtml(t.bodyHtml),
        updatedLabel: t.updatedAt
          ? new Date(t.updatedAt).toLocaleDateString()
          : t.createdAt
            ? new Date(t.createdAt).toLocaleDateString()
            : '—',
        isActive: !!t.isActive,
      })),
    [templates],
  );

  const tableColumns = useMemo(
    () => [
      {
        id: 'roll',
        label: '#',
        field: 'roll',
        align: 'center',
        headerSx: rollColSx,
        cellSx: { ...rollColSx, color: 'var(--muted)', fontWeight: 600 },
      },
      {
        id: 'templateName',
        label: 'Template Name',
        field: 'templateName',
        render: (row) =>  <Typography
      variant="body2"
      component="span"
      title={row.templateName}
      sx={{
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        minWidth: 0,
        color: 'var(--primary)',
        fontWeight: 600,
        cursor: 'pointer',
        '&:hover': { textDecoration: 'underline' },
      }}
    >
      {row.templateName || '—'}
    </Typography>,
        headerSx: nameColSx,
        cellSx: nameColSx,
      },
      {
        id: 'agreementType',
        label: 'Category',
        field: 'agreementType',
        render: (row) => <TruncateCell value={row.agreementType} />,
        headerSx: categoryColSx,
        cellSx: categoryColSx,
      },
      {
        id: 'preview',
        label: 'Subject / Body',
        field: 'preview',
        render: (row) => <PreviewCell value={row.preview} />,
        headerSx: previewColSx,
        cellSx: previewColSx,
      },
      {
        id: 'updated',
        label: 'Updated',
        field: 'updatedLabel',
        headerSx: dateColSx,
        cellSx: dateColSx,
      },
      {
        id: 'createdBy',
        label: 'Created By',
        field: 'createdByUserId',
        headerSx: createdByColSx,
        cellSx: createdByColSx,
      },
      {
        id: 'active',
        label: 'Active',
        field: 'active',
        align: 'center',
        headerSx: activeColSx,
        cellSx: activeColSx,
        render: (row) => (
          <Typography
            variant="body2"
            component="span"
            sx={{
              fontWeight: 600,
              color: row.isActive ? 'rgb(51, 133, 198)' : 'var(--muted)',
            }}
          >
            {row.isActive ? 'Yes' : 'No'}
          </Typography>
        ),
      },
      {
        id: 'action',
        label: 'Action',
        field: 'action',
        align: 'center',
        headerSx: actionColSx,
        cellSx: actionColSx,
        render: (row) => (
          <TemplateActions templateId={row.templateId} onDelete={onDelete} />
        ),
      },
    ],
    [onDelete],
  );

  const handleRowClick = (row) => {
    navigate(`/agreement-template/${row.templateId}/edit`);
  };
  return (
    <Card elevation={0} sx={{ ...sectionCardSx, overflow: 'hidden' }}>
      <Box sx={{ px: contentInset, pt: contentInset, pb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
          All Agreement Templates
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
          <CircularProgress />
        </Box>
      ) : tableRows.length === 0 ? (
        <Box sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
          <Typography color="text.secondary">No templates found.</Typography>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <ResponsiveTable
            columns={tableColumns}
            rows={tableRows}
            getRowKey={(row) => row.templateId}
            variant="resource"
            alwaysTable
            tableMinWidth={TABLE_MIN_WIDTH}
            sx={agreementTableSx}
            onRowClick={handleRowClick}
          />
        </Box>
      )}
    </Card>
  );
}
