import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getActivityHistoryByUserId } from '../../api/viewActivityHistoryApi';

function formatFullDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function computeClicks(snap) {
  const totalField = snap.TotalClicks ?? snap.totalClicks;
  if (typeof totalField === 'number') return totalField;

  const mouse = Number(snap.MouseClicks ?? snap.mouseClicks ?? 0) || 0;
  const keyboard = Number(snap.KeyboardClicks ?? snap.keyboardClicks ?? 0) || 0;
  return mouse + keyboard;
}

function clicksToPct(clicks) {
  const n = Number(clicks) || 0;
  if (n <= 10) return 0;
  if (n >= 100) return 100;
  if (n <= 49) return Math.round(((n - 6) / (49 - 6)) * 50);
  return Math.round(50 + ((n - 50) / (99 - 50)) * 50);
}

function parseSnapTime(snap) {
  const raw = snap.SnapOn ?? snap.snapOn ?? snap.SnapOnTime ?? snap.snapOnTime;
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const parts = String(raw).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?/);
  if (!parts) return null;

  let hour = parseInt(parts[1], 10);
  const minute = parseInt(parts[2], 10);
  const second = parts[3] ? parseInt(parts[3], 10) : 0;
  const ampm = parts[4];

  if (ampm && /am/i.test(ampm) && hour === 12) hour = 0;
  if (ampm && /pm/i.test(ampm) && hour < 12) hour += 12;

  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, second);
}

function mapEntryDto(dto) {
  const snaps = Array.isArray(dto.snaps) ? dto.snaps : [];

  const thumbs = snaps.map((snap) => {
    const snapRaw = snap.SnapOn ?? snap.snapOn ?? snap.SnapOnTime ?? snap.snapOnTime ?? null;
    const snapDate = snapRaw ? new Date(snapRaw) : null;
    const isValidDate = snapDate instanceof Date && !Number.isNaN(snapDate.getTime());
    const timeLabel = isValidDate
      ? snapDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : snapRaw ?? '';

    const clicks = computeClicks(snap);
    const pct = clicksToPct(clicks);
    const image = snap.snapThumbnailPath ?? snap.snapThumbnail ?? snap.snapPath ?? snap.snap ?? '';
    const full = snap.snapPath ?? snap.snap ?? image;

    return {
      thumb: image,
      full,
      time: timeLabel,
      pct,
      clicks,
      taskName: snap.TaskName ?? snap.taskName ?? '',
      id: snap.UserSnapId ?? snap.userSnapId ?? null,
    };
  });

  const originalRange = dto.TimeRange || dto.timeRange || '';
  const snapDates = snaps.map(parseSnapTime).filter(Boolean);
  let displayRange = originalRange;

  if (snapDates.length > 0) {
    const minT = new Date(Math.min(...snapDates.map((d) => d.getTime())));
    const maxT = new Date(Math.max(...snapDates.map((d) => d.getTime())));
    const startStr = minT.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const endStr = maxT.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const diffMinutes = Math.max(0, Math.round((maxT.getTime() - minT.getTime()) / 60000));
    const hrs = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    displayRange = `${startStr} - ${endStr} (${hrs}:${mins.toString().padStart(2, '0')} hrs)`;
  }

  return {
    range: displayRange,
    title: dto.MachineName || dto.machineName || `Activity (${dto.UserTrackingId ?? dto.userTrackingId ?? ''})`,
    thumbs,
    raw: dto,
  };
}

function buildMappedEntries(entries) {
  const mapped = (entries || []).map(mapEntryDto);

  let summedMinutes = 0;
  mapped.forEach((entry) => {
    const match = (entry.range || '').match(/\((\d+):(\d{2})\s*hrs?\)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      summedMinutes += hours * 60 + minutes;
    }
  });

  const hours = Math.floor(summedMinutes / 60);
  const mins = summedMinutes % 60;

  return {
    mapped,
    totalTimeStr: `${hours}:${mins.toString().padStart(2, '0')}`,
  };
}

function ActivityThumbGrid({ entry, onOpenImage }) {
  const [selected, setSelected] = useState(0);
  const images = (entry.thumbs || []).map((thumb) => thumb.full || thumb.thumb || '');

  const handleThumbClick = (index) => {
    setSelected(index);
    onOpenImage(index, images, entry.thumbs?.[index]?.taskName);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(auto-fill, minmax(108px, 1fr))',
          sm: 'repeat(auto-fill, minmax(118px, 1fr))',
          lg: 'repeat(9, minmax(0, 1fr))',
        },
        gap: { xs: 1.25, md: 1.5 },
        width: '100%',
      }}
    >
      {entry.thumbs.map((thumb, index) => (
        <Box key={thumb.id ?? index} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
          <Box
            onClick={() => handleThumbClick(index)}
            sx={{
              width: '100%',
              borderRadius: 1.5,
              overflow: 'hidden',
              border: '1px solid var(--card-border)',
              bgcolor: 'var(--muted-bg)',
              cursor: 'pointer',
              outline: index === selected ? '2px solid var(--primary)' : 'none',
              outlineOffset: 1,
            }}
          >
            <Box
              component="img"
              src={thumb.thumb || thumb.full}
              alt={thumb.time}
              sx={{ width: '100%', height: { xs: 70, md: 60 }, objectFit: 'cover', display: 'block' }}
            />
          </Box>

          <Box sx={{ mt: 0.75, width: '100%', maxWidth: 120 }}>
            <Box
              sx={{
                height: 8,
                width: '100%',
                bgcolor: '#e9ecef',
                borderRadius: 1,
                overflow: 'hidden',
                mb: 0.75,
              }}
            >
              <Box
                sx={{
                  width: `${thumb.pct || 0}%`,
                  height: '100%',
                  bgcolor: (thumb.pct || 0) > 0 ? 'var(--success)' : '#cfd8dc',
                  transition: 'width 0.25s ease',
                }}
              />
            </Box>

            <Typography
              title={thumb.taskName || ''}
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text)',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textAlign: 'center',
              }}
            >
              {thumb.taskName || '—'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', mt: 0.25 }}>
              {thumb.time || ''}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default function ViewActivityHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const incomingWorkDate = state?.workDate || new Date().toISOString().split('T')[0];
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workDate, setWorkDate] = useState(incomingWorkDate);
  useEffect(() => {
    setWorkDate(incomingWorkDate);
  }, [incomingWorkDate]);

  const [modalImage, setModalImage] = useState(null);
  const [imageError, setImageError] = useState(false);

  const mappedEntries = useMemo(() => buildMappedEntries(entries), [entries]);

  const fetchActivityHistory = useCallback(async () => {
    if (!id) {
      setError('User ID is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      debugger;
      const data = await getActivityHistoryByUserId({ userId: id, date: workDate });
      setEntries(data);
    } catch (e) {
      console.error('Failed to fetch activity history:', e);
      setError(`Failed to load activity history: ${e.message}`);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [id, workDate]);

  const handleRefresh = useCallback(() => {
    fetchActivityHistory();
  }, []);

  const openImage = useCallback((index, images, caption) => {
    setModalImage({ index, images, caption });
    setImageError(false);
  }, []);

  const closeModal = useCallback(() => {
    setModalImage(null);
    setImageError(false);
  }, []);

  const prevImage = useCallback(() => {
    setModalImage((prev) => {
      if (!prev) return prev;
      return { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length };
    });
    setImageError(false);
  }, []);

  const nextImage = useCallback(() => {
    setModalImage((prev) => {
      if (!prev) return prev;
      return { ...prev, index: (prev.index + 1) % prev.images.length };
    });
    setImageError(false);
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (!modalImage) return;
      if (event.key === 'Escape') closeModal();
      if (event.key === 'ArrowLeft') prevImage();
      if (event.key === 'ArrowRight') nextImage();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalImage, closeModal, prevImage, nextImage]);

  useEffect(() => {
    fetchActivityHistory();
  }, [fetchActivityHistory]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{ color: 'var(--muted)', border: '1px solid var(--card-border)', bgcolor: '#fff' }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <Typography sx={{ fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>
          {formatFullDate(workDate)}
        </Typography>
        {id && (
          <Typography sx={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            User ID: {id}
          </Typography>
        )}
      </Stack>

      <Paper
        elevation={0}
        className="dashboard-card"
        sx={{ borderRadius: 3, p: { xs: 1.5, md: 2 }, mb: 2 }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.75rem' }, fontWeight: 700, color: 'var(--text)' }}>
                Total: {mappedEntries.totalTimeStr}
              </Typography>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh activity"
                sx={{ color: 'var(--muted)' }}
              >
                {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Stack>
            <Typography sx={{ fontSize: '0.82rem', color: 'var(--muted)', mt: 0.5 }}>
              Detailed tracked time for the selected day
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--success)' }} />
              <Typography sx={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tracked</Typography>
            </Stack>
            <Typography sx={{ fontWeight: 700, color: 'var(--text)', mt: 0.25 }}>
              {mappedEntries.totalTimeStr}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      ) : mappedEntries.mapped.length === 0 ? (
        <Paper
          elevation={0}
          className="dashboard-card"
          sx={{ borderRadius: 3, p: 4, mb: 2, textAlign: 'center' }}
        >
          <Typography color="text.secondary">
            No activity history found for this user on the selected date.
          </Typography>
        </Paper>
      ) : (
        mappedEntries.mapped.map((entry, entryIndex) => (
          <Paper
            key={entry.raw.userTrackingId || entryIndex}
            elevation={0}
            className="dashboard-card"
            sx={{ borderRadius: 3, p: { xs: 1.25, md: 1.5 }, mb: 2 }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.25 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'var(--success)', flexShrink: 0 }} />
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{entry.range}</Typography>
              </Stack>
              <IconButton size="small" sx={{ color: 'var(--muted)' }}>
                <MoreHorizIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--text)',
                mb: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {entry.title}
            </Typography>

            <ActivityThumbGrid entry={entry} onOpenImage={openImage} />
          </Paper>
        ))
      )}

      <Dialog
        open={Boolean(modalImage)}
        onClose={closeModal}
        maxWidth={false}
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.82)' } },
        }}
      >
        <DialogContent sx={{ position: 'relative', p: 0, overflow: 'visible' }}>
          <IconButton
            onClick={closeModal}
            aria-label="Close preview"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              bgcolor: 'var(--primary)',
              color: '#fff',
              '&:hover': { bgcolor: 'var(--primary-dark)' },
            }}
          >
            <CloseIcon />
          </IconButton>

          {modalImage && modalImage.index > 0 && (
            <IconButton
              onClick={prevImage}
              aria-label="Previous image"
              sx={{
                position: 'absolute',
                top: '50%',
                left: 8,
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'var(--primary)',
                color: '#fff',
                '&:hover': { bgcolor: 'var(--primary-dark)' },
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          )}

          {modalImage && modalImage.index < modalImage.images.length - 1 && (
            <IconButton
              onClick={nextImage}
              aria-label="Next image"
              sx={{
                position: 'absolute',
                top: '50%',
                right: 8,
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'var(--primary)',
                color: '#fff',
                '&:hover': { bgcolor: 'var(--primary-dark)' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}

          {modalImage?.images[modalImage.index] && !imageError ? (
            <Box
              component="img"
              src={modalImage.images[modalImage.index]}
              alt={`Preview ${modalImage.index + 1}`}
              onError={() => setImageError(true)}
              sx={{
                maxWidth: 'min(96vw, 1280px)',
                maxHeight: '90vh',
                objectFit: 'contain',
                display: 'block',
                borderRadius: 1,
              }}
            />
          ) : (
            <Box
              sx={{
                width: { xs: '90vw', md: 720 },
                height: { xs: 240, md: 420 },
                bgcolor: '#d7cdcd',
                color: 'var(--text)',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 1,
                fontWeight: 600,
              }}
            >
              No Image Available.
            </Box>
          )}

          {modalImage?.caption && (
            <Typography sx={{ color: '#fff', textAlign: 'center', mt: 1, fontSize: '0.875rem' }}>
              {modalImage.caption}
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
