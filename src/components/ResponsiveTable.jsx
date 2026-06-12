import {
  Box,
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

export default function ResponsiveTable({ columns, rows, getRowKey, sx, onRowClick, alwaysTable = false }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const mobileColumns = columns.filter((col) => !col.hideOnMobile);

  const renderCellValue = (row, column) => {
    if (column.render) {
      return column.render(row);
    }
    return row[column.field];
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
              {mobileColumns.map((column) => (
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
                      textAlign: column.align === 'left' ? 'left' : 'right',
                      minWidth: 0,
                      flex: 1,
                      display: 'flex',
                      justifyContent: column.align === 'left' ? 'flex-start' : 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    {(() => {
                      const value = renderCellValue(row, column);
                      if (typeof value === 'string' || typeof value === 'number') {
                        return (
                          <Typography variant="body2" sx={{ color: 'var(--text)', wordBreak: 'break-word', ...column.cellSx }}>
                            {value}
                          </Typography>
                        );
                      }
                      return value;
                    })()}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer sx={{ width: '100%', overflowX: 'hidden', ...sx }}>
      <Table sx={{ width: '100%' }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'var(--muted-bg)' }}>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                sx={{
                  color: 'var(--muted)',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  py: 0.75,
                  px: 1.25,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
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
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sx={{
                    fontSize: '0.82rem',
                    py: 0.85,
                    px: 1.25,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    verticalAlign: 'top',
                    ...column.cellSx,
                  }}
                >
                  {renderCellValue(row, column)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
