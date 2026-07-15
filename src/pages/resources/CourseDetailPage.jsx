import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box,Button, Link, Paper, Typography,} from '@mui/material';
import { fetchCourseList } from '../../api/coursesApi';
import { getResourceConfig } from '../../config/resourceConfig';

export default function CourseDetailPage({
  basePath = '/courses',
}) {
  const navigate = useNavigate();
  const resource = getResourceConfig(basePath);

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

  if (!resource) return null;

  if (loading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography sx={{ color: 'var(--muted)' }}>
          Loading courses...
        </Typography>
      </Box>
    );
  }

 return (
  <Box>
    <Typography variant="h5" sx={{ fontWeight: 700 }}>
      Courses
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

      {rows.map((item) => (
        <Box
          key={item.courseId}
          onClick={() => navigate(`${basePath}/${item.courseId}`)}
          sx={{ cursor: 'pointer' }}
        >
          {item.instituteName} | {item.courseName} | {item.courseCategory || '—'} |{' '}
          {item.level || '—'} | {item.campus || '—'} | {item.intake || '—'} |{' '}
          {item.fees ?? '—'} | {item.duration || '—'} |{' '}

          <CourseLink value={item.programLink} label="Link" />

          {' | '}

          <CourseLink value={item.programLogo} label="Logo" />
        </Box>
      ))}
    </Paper>
  </Box>
);
}