/** Shared dense list table styling for vendor / institute commission pages. */
export const resourceTableSx = {
  borderTop: '1px solid #e8ecf1',
};

export const resourceTableHeadRowSx = {
  backgroundColor: '#eef2f7',
};

export const resourceTableHeadCellSx = {
  color: '#3d4f66',
  fontWeight: 700,
  fontSize: '0.8125rem',
  py: 1,
  px: 1.5,
  borderBottom: '1px solid #dce3ec',
  whiteSpace: 'nowrap',
};

export const resourceTableBodyRowSx = {
  backgroundColor: '#fff',
  '&:hover': { backgroundColor: '#f8fafc' },
  '&:last-child td': { borderBottom: 0 },
};

export const resourceTableBodyCellSx = {
  fontSize: '0.8125rem',
  color: '#1a2b3d',
  py: 1,
  px: 1.5,
  borderBottom: '1px solid #e8ecf1',
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};
