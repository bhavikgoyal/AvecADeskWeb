import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { fetchCourseList } from '../../api/coursesApi';
import { getResourceConfig } from '../../config/resourceConfig';
import TableContentSkeleton from '../../components/TableContentSkeleton';

const INSTITUTE_SCRAPPING_BASE_PATH = '/institutes-scrapping';

// NOTE: adjust this to match however your project already exposes the API base URL
// (e.g. import it from '../../api/axiosClient' if it's exported there instead).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default function CourseDetailPage({
  basePath = '/courses',
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resource = getResourceConfig(basePath);
  const instituteFilter = (searchParams.get('institute') || '').trim();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await fetchCourseList();

        setRows(
          (Array.isArray(data) ? data : []).map((item) => ({
            ...item,
            id: String(item.courseId),
          }))
        );
      } catch (err) {
        setError(
          err.message || 'Failed to load courses.'
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const filteredRows = useMemo(() => {
    if (!instituteFilter) return rows;
    const target = instituteFilter.toLowerCase();
    return rows.filter((item) => (item.instituteName || '').trim().toLowerCase() === target);
  }, [rows, instituteFilter]);

  if (!resource) return null;

  if (loading) {
    return (
      <TableContentSkeleton
        rows={8}
        columns={[
          { id: 'instituteName', label: 'Institute', flex: 1.4 },
          { id: 'courseName', label: 'Course', flex: 1.4 },
          { id: 'category', label: 'Category', flex: 1 },
          { id: 'level', label: 'Level', flex: 0.8 },
          { id: 'campus', label: 'Campus', flex: 1 },
          { id: 'fees', label: 'Fees', flex: 0.7 },
        ]}
      />
    );
  }

  return (
    <Box>
      {instituteFilter && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(INSTITUTE_SCRAPPING_BASE_PATH)}
          sx={{ textTransform: 'none', mb: 1.5 }}
        >
          Back to Institute
        </Button>
      )}

      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Courses{instituteFilter ? ` — ${instituteFilter}` : ''}
      </Typography>

      <Typography sx={{ color: 'var(--muted)', mb: 2 }}>
        Manage courses offered across institutes.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0}>
        <Button onClick={() => navigate(`${basePath}/new`)}>
          Add Course
        </Button>

        {filteredRows.map((item) => (
          <Box
            key={item.courseId}
            onClick={() => navigate(`${basePath}/${item.courseId}`)}
            sx={{ cursor: 'pointer' }}
          >
            {item.instituteName} | {item.courseName} | {item.CourseCategory || '—'} |{' '}
            {item.level || '—'} | {item.campus || '—'} | {item.intake || '—'} |{' '}
            {item.fees ?? '—'} | {item.duration || '—'} |{' '}

            {item.programLink ? (
              <Link
                href={item.programLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Link
              </Link>
            ) : (
              '—'
            )}

            {' | '}

            {item.programLogo ? (
              <Link
                href={`${API_BASE_URL}${item.programLogo}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                Logo
              </Link>
            ) : (
              '—'
            )}
          </Box>
        ))}

        {filteredRows.length === 0 && (
          <Typography sx={{ color: 'var(--muted)', px: 2, py: 3 }}>
            No courses found{instituteFilter ? ` for "${instituteFilter}"` : ''}.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
