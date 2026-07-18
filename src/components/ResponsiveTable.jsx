import {
  Box,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  LIST_PRIMARY_COLUMN_COLOR,
  resourceTableBodyCellSx,
  resourceTableBodyRowSx,
  resourceTableHeadCellSx,
  resourceTableHeadRowSx,
  resourceTableSx,
} from './resourceTableStyles';
import axiosClient from '../api/axiosClient'; 

function renderTextCell(value, column, columnIndex, onRowClick) {
  const isPrimaryLink = onRowClick && columnIndex === 0;
  if (typeof value === 'string' || typeof value === 'number') {
    return (
      <Typography
        variant="body2"
        component="span"
        sx={{
          color: isPrimaryLink ? LIST_PRIMARY_COLUMN_COLOR : 'var(--text)',
          fontWeight: isPrimaryLink ? 600 : 400,
          wordBreak: 'break-word',
          fontSize: 'inherit',
          ...column.cellSx,
        }}
      >
        {value}
      </Typography>
    );
  }
  return value;
}

export default function ResponsiveTable({
  columns,
  rows,
  getRowKey,
  sx,
  onRowClick,
  alwaysTable = false,
  variant = 'default',
  collapseToCardsBelow = 'md',
  tableMinWidth,
}) {
  const theme = useTheme();
  const cardBreakpoint =
    typeof collapseToCardsBelow === 'number'
      ? collapseToCardsBelow
      : theme.breakpoints.values[collapseToCardsBelow] ?? theme.breakpoints.values.md;
  const isMobile = useMediaQuery(`(max-width:${cardBreakpoint - 0.05}px)`);
  const mobileColumns = columns.filter((col) => !col.hideOnMobile);
  const isResource = variant === 'resource' || alwaysTable;
  const API_BASE_URL = axiosClient.defaults.baseURL;
 
const isValidUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const renderCellValue = (row, column) => {
  if (column.render) {
    return column.render(row);
  }

  const value = row[column.field];

  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return '-';
  }

  if (column.field === 'programLink') {
  if (!isValidUrl(value)) {
    return '-';
  }

  return (
    <Link
      href={value}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
    >
      Link
    </Link>
  );
}

if (column.field === 'programLogo') {
  if (!value) return '-';

  let finalUrl = value;

  if (!isValidUrl(value)) {
    finalUrl = `${API_BASE_URL}/${value.replace(/^wwwroot[\\/]/, '')}`;
  }

  return (
    <Link
      href={finalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      Logo
    </Link>
  );
}
  return value;
};

  const renderAsTable = alwaysTable ? true : !isMobile;

  if (!renderAsTable) {
    return (
      <Stack spacing={1.5} sx={{ px: { xs: 2, md: 0 }, py: { xs: 2, md: 0 }, ...sx }}>
        {rows.map((row) => (
          <Paper
            key={getRowKey(row)}
            variant="outlined"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            sx={{
              p: 2,
              borderRadius: 2,
              borderColor: 'var(--muted-border)',
              backgroundColor: 'var(--card-bg)',
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            <Stack spacing={0.75}>
              {mobileColumns.map((column, columnIndex) => (
                <Box
                  key={column.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 2,
                    py: 0.25,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'var(--muted)', fontWeight: 700, flexShrink: 0, pt: 0.25 }}
                  >
                    {column.label}
                  </Typography>
                  <Box
                    sx={{
                      textAlign: column.align === 'left' ? 'left' : column.align === 'center' ? 'center' : 'right',
                      minWidth: 0,
                      flex: 1,
                      display: 'flex',
                      justifyContent:
                        column.align === 'left'
                          ? 'flex-start'
                          : column.align === 'center'
                            ? 'center'
                            : 'flex-end',
                      flexWrap: column.id === 'action' ? 'nowrap' : 'wrap',
                    }}
                  >
                    {renderTextCell(renderCellValue(row, column), column, columnIndex, onRowClick)}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  const resolvedTableMinWidth = tableMinWidth ?? (isResource ? 960 : undefined);

  return (
    <TableContainer
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'block',
        WebkitOverflowScrolling: 'touch',
        ...(isResource ? resourceTableSx : {}),
        ...sx,
      }}
    >
      <Table
        sx={{
          width: '100%',
          minWidth: resolvedTableMinWidth,
          tableLayout: resolvedTableMinWidth ? 'fixed' : 'auto',
        }}
      >
        <TableHead>
          <TableRow sx={isResource ? resourceTableHeadRowSx : { backgroundColor: 'var(--muted-bg)' }}>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                sx={{
                  ...(isResource
                    ? resourceTableHeadCellSx
                    : {
                        color: 'var(--muted)',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        py: 0.75,
                        px: 1.25,
                        whiteSpace: 'normal',
                        wordBreak: 'break-word',
                      }),
                  ...column.headerSx,
                }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowKey(row)}
              hover
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                ...(isResource ? resourceTableBodyRowSx : {}),
                ...(onRowClick
                  ? {
                      '& td:first-of-type': {
                        color: LIST_PRIMARY_COLUMN_COLOR,
                        fontWeight: 600,
                      },
                    }
                  : {}),
              }}
            >
              {columns.map((column, columnIndex) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{
                    ...(isResource
                      ? resourceTableBodyCellSx
                      : {
                          fontSize: '0.82rem',
                          py: 0.85,
                          px: 1.25,
                          whiteSpace: 'normal',
                          wordBreak: 'break-word',
                          verticalAlign: 'top',
                        }),
                    ...column.cellSx,
                  }}
                >
                  {renderTextCell(renderCellValue(row, column), column, columnIndex, onRowClick)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
