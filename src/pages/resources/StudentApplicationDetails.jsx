import { useEffect, useState } from 'react';
import {
    Alert, Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress,
    TextField, InputAdornment, Pagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { FormPageLayout, formPaperSx } from '../../components/forms';
import { getStudentApplications } from '../../api/StudentApplicationApi';
import { getResourceConfig } from '../../config/resourceConfig';


export default function StudentApplicationDetailsPage() {
    const resource = getResourceConfig('/reports/student-Inquiry');

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const pageSize = 200;
    const [totalRecords, setTotalRecords] = useState(0);

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    const start = (pageNumber - 1) * pageSize + 1;  // first record number
    const end = Math.min(pageNumber * pageSize, totalRecords); // last record number

    const startPage = Math.floor((pageNumber - 1) / 5) * 5 + 1; // first page button
    const endPage = Math.min(startPage + 4, totalPages);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async (searchText = '', pageNo = pageNumber, size = pageSize) => {
        try {
            setLoading(true);

            const response = await getStudentApplications(searchText, pageNo, size);
            console.log(response);
            setRows(response.data ?? []);
            setTotalRecords(response.totalRecords ?? 0);
        } catch (err) {
            setError(err.message || 'Failed to load student applications.');
        } finally {
            setLoading(false);
        }
    };
    const pageButtonStyle = {
        width: 34,
        height: 34,
        border: "none",
        borderRight: "1px solid #e5e7eb",
        background: "#fff",
        cursor: "pointer",
        fontSize: "14px",

        "&:last-child": {
            borderRight: "none",
        },
    };
return (
        <FormPageLayout
            title={resource.plural}
            subtitle="Student Application Details"
            metaItems={[
                {
                    label: 'Total Records',
                    value: totalRecords,
                },
            ]}
        >
            <Paper elevation={0} sx={{ ...formPaperSx, width: '100%' }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 2,
                    }}
                >
                    <TextField
                        size="small"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearch(value);
                            setPageNumber(1);
                            loadData(value, 1, pageSize);
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            width: "350px",
                            minWidth: "180px",
                            maxWidth: "350px",
                            flex: "0 0 350px",
                        }}
                    />

                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                        }}
                    >
                        <Typography
                            variant="body2"
                            sx={{ whiteSpace: "nowrap" }}
                        >
                            Showing {start}-{end} of {totalRecords}
                        </Typography>

                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                border: "1px solid #d9d9d9",
                                borderRadius: "6px",
                                overflow: "hidden",
                                background: "#fff",
                            }}
                        >
                            {/* Previous */}
                            <Box
                                component="button"
                                onClick={() => {
                                    if (pageNumber > 1) {
                                        setPageNumber(pageNumber - 1);
                                        loadData(search, pageNumber - 1, pageSize);
                                    }
                                }}
                                sx={pageButtonStyle}
                            >
                                ‹
                            </Box>

                            {/* Pages */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const page = startPage + i;
                                if (page > totalPages) return null;

                                return (
                                    <Box
                                        key={page}
                                        component="button"
                                        onClick={() => {
                                            setPageNumber(page);
                                            loadData(search, page, pageSize);
                                        }}
                                        sx={{
                                            ...pageButtonStyle,
                                            bgcolor: page === pageNumber ? "#1976d2" : "#fff",
                                            color: page === pageNumber ? "#fff" : "#1f2937",
                                            fontWeight: 600,
                                            "&:hover": {
                                                bgcolor: page === pageNumber ? "#1976d2" : "#fff",
                                            },
                                        }}
                                    >
                                        {page}
                                    </Box>
                                );
                            })}

                            {/* Next */}
                            <Box
                                component="button"
                                onClick={() => {
                                    if (pageNumber < totalPages) {
                                        setPageNumber(pageNumber + 1);
                                        loadData(search, pageNumber + 1, pageSize);
                                    }
                                }}
                                sx={pageButtonStyle}
                            >
                                ›
                            </Box>
                        </Box>
                    </Box>
                </Box>

                {loading ? (
                    <Box
                        sx={{
                            py: 5,
                            display: 'flex',
                            justifyContent: 'center',
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>

                            <TableHead
                                sx={{
                                    backgroundColor: '#eef2f6',
                                }}
                            >
                                <TableRow>
                                    {resource.columns.map((column) => (
                                        <TableCell
                                            key={column.id}
                                            sx={{
                                                backgroundColor: '#eef2f6',
                                                color: '#23395d',
                                                fontWeight: 700,
                                                fontSize: '14px',
                                                borderBottom: '1px solid #d7dde5',
                                                padding: '12px 16px',
                                            }}
                                        >
                                            {column.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {rows.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={resource.columns.length}
                                            align="center"
                                        >
                                            No Records Found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rows.map((row) => (
                                        <TableRow key={row.id} hover>
                                            {resource.columns.map((column) => (
                                                <TableCell key={column.id}>
                                                    {row[column.field]}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>

                        </Table>

                    </TableContainer>
                )}
            </Paper>
        </FormPageLayout>
    );
}