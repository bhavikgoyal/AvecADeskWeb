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

const contentInset = { xs: 1.5, sm: 2 };

const sectionCardSx = {
  width: '100%',
  minWidth: 0,
  border: '1px solid var(--card-border)',
  bgcolor: 'var(--card-bg)',
  borderRadius: 2,
  boxShadow: '0 4px 16px rgba(26, 43, 61, 0.05)',
};

function ActivityThumbCard({ thumb, selected, onClick }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = thumb.thumb || thumb.full || '';
  const showPlaceholder = !imageSrc || imageFailed;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
      <Box
        onClick={onClick}
        sx={{
          width: '100%',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #dce3ec',
          bgcolor: '#fff',
          cursor: 'pointer',
          outline: selected ? '2px solid var(--primary)' : 'none',
          outlineOffset: 1,
        }}
      >
        {showPlaceholder ? (
          <Box sx={{ width: '100%', height: { xs: 68, md: 64 }, bgcolor: '#1f325d' }} />
        ) : (
          <Box
            component="img"
            src={imageSrc}
            alt={thumb.time}
            onError={() => setImageFailed(true)}
            sx={{
              width: '100%',
              height: { xs: 68, md: 64 },
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          mt: 0.5,
          height: 8,
          width: '100%',
          bgcolor: '#e9ecef',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: `${thumb.pct || 0}%`,
            height: '100%',
            bgcolor: (thumb.pct || 0) > 0 ? '#22a06b' : '#cfd8dc',
            transition: 'width 0.25s ease',
          }}
        />
      </Box>

      <Box sx={{ mt: 0.75, width: '100%', px: 0.25 }}>
        <Typography
          title={thumb.taskName || ''}
          sx={{
            fontSize: { xs: '0.65rem', sm: '0.68rem' },
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.25,
            textTransform: 'uppercase',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {thumb.taskName || '—'}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '0.65rem', sm: '0.68rem' },
            color: 'var(--muted)',
            textAlign: 'center',
            mt: 0.25,
            lineHeight: 1.2,
          }}
        >
          {thumb.time || ''}
        </Typography>
      </Box>
    </Box>
  );
}

function ActivityThumbGrid({ entry, onOpenImage }) {
  const [selected, setSelected] = useState(0);
  const images = (entry.thumbs || []).map((thumb) => thumb.full || thumb.thumb || '');

  const handleThumbClick = (index) => {
    setSelected(index);
    const thumb = entry.thumbs?.[index];
    const caption = [thumb?.taskName, thumb?.time].filter(Boolean).join(' · ') || 'Activity screenshot';
    onOpenImage(index, images, caption);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(auto-fill, minmax(96px, 1fr))',
          sm: 'repeat(auto-fill, minmax(104px, 1fr))',
          md: 'repeat(8, minmax(0, 1fr))',
          lg: 'repeat(13, minmax(0, 1fr))',
        },
        gap: { xs: 1, sm: 1.25 },
        width: '100%',
      }}
    >
      {entry.thumbs.map((thumb, index) => (
        <ActivityThumbCard
          key={thumb.id ?? index}
          thumb={thumb}
          selected={index === selected}
          onClick={() => handleThumbClick(index)}
        />
      ))}
    </Box>
  );
}

export default function ViewActivityHistoryPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { state } = useLocation();

  const userName = state?.memberName;
  const workDate = useMemo(
    () => state?.workDate || new Date().toISOString().split('T')[0],
    [state?.workDate],
  );
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleRefresh = fetchActivityHistory;

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
    let cancelled = false;

    async function loadActivityHistory() {
      if (!id) {
        if (!cancelled) {
          setError('User ID is missing.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await getActivityHistoryByUserId({ userId: id, date: workDate });
        if (!cancelled) setEntries(data);
      } catch (e) {
        if (!cancelled) {
          console.error('Failed to fetch activity history:', e);
          setError(`Failed to load activity history: ${e.message}`);
          setEntries([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadActivityHistory();

    return () => {
      cancelled = true;
    };
  }, [id, workDate]);

  return (
    <>
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, px: contentInset }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 1.5, sm: 2 }}
        sx={{ mb: 2, flexWrap: 'wrap' }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => navigate(-1)}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            border: 'none',
            bgcolor: 'transparent',
            color: '#8b95a5',
            cursor: 'pointer',
            p: 0,
            fontFamily: 'inherit',
            fontSize: { xs: '0.9375rem', sm: '1rem' },
            fontWeight: 500,
            lineHeight: 1.2,
            flexShrink: 0,
            '&:hover': { color: 'var(--text)' },
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
          Back
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            color: 'var(--text)',
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            lineHeight: 1.2,
          }}
        >
          {formatFullDate(workDate)}
        </Typography>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid var(--card-border)',
          bgcolor: 'var(--card-bg)',
          boxShadow: '0 4px 16px rgba(26, 43, 61, 0.05)',
          p: { xs: 2, sm: 2.25 },
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'flex-start' },
            width: '100%',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
              <Typography
                component="span"
                sx={{
                  fontSize: { xs: '24px', sm: '28px' },
                  fontWeight: 700,
                  color: 'var(--text)',
                  lineHeight: 1.15,
                }}
              >
                Total: {mappedEntries.totalTimeStr}
              </Typography>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh activity"
                sx={{
                  color: '#8b95a5',
                  p: 0.5,
                  ml: 0.25,
                  '&:hover': { bgcolor: 'transparent', color: 'var(--text)' },
                }}
              >
                {loading ? <CircularProgress size={18} /> : <RefreshIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />}
              </IconButton>
            </Stack>
            <Typography
              sx={{
                fontSize: { xs: '0.9375rem', sm: '1rem' },
                color: '#8b95a5',
                mt: 0.75,
                lineHeight: 1.4,
              }}
            >
              Detailed tracked time for the selected day
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
              pt: { xs: 0, sm: 0.25 },
              ml: 'auto',
              textAlign: 'right',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22a06b' }} />
              <Typography sx={{ fontSize: { xs: '0.9375rem', sm: '1rem' }, color: '#8b95a5', fontWeight: 500 }}>
                Tracked
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontWeight: 700,
                color: 'var(--text)',
                mt: 0.5,
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                lineHeight: 1.1,
                textAlign: 'right',
              }}
            >
              {mappedEntries.totalTimeStr}
            </Typography>
          </Box>
        </Box>
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
        <Paper elevation={0} sx={{ ...sectionCardSx, p: 4, mb: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No activity history found for this user on the selected date.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ width: '100%' }}>
          {mappedEntries.mapped.map((entry, entryIndex) => (
            <Box
              key={entry.raw.userTrackingId || entryIndex}
              sx={{ mb: entryIndex < mappedEntries.mapped.length - 1 ? 3 : 0 }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.25 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#22a06b', flexShrink: 0 }} />
                  <Typography
                    sx={{
                      fontSize: { xs: '0.8rem', sm: '0.84rem' },
                      color: 'var(--text)',
                      fontWeight: 500,
                      lineHeight: 1.3,
                    }}
                  >
                    {entry.range}
                  </Typography>
                </Stack>
                <IconButton size="small" sx={{ color: '#8b95a5', flexShrink: 0 }} aria-label="More options">
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '0.88rem', sm: '0.92rem' },
                  color: 'var(--text)',
                  mb: 1.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                {userName || entry.title}
              </Typography>

              <ActivityThumbGrid entry={entry} onOpenImage={openImage} />
            </Box>
          ))}
        </Box>
      )}

    </Box>

      <Dialog
        open={Boolean(modalImage)}
        onClose={closeModal}
        maxWidth={false}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'center',
            justifyContent: 'center',
          },
          '& .MuiDialog-paper': {
            width: '70vw',
            maxWidth: '70vw !important',
            height: '95vh',
            maxHeight: '95vh',
            minHeight: '95vh',
            m: 0,
            bgcolor: '#fff',
            borderRadius: 2,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.45)',
            border: '1px solid #dce3ec',
          },
        }}
        slotProps={{
          backdrop: { sx: { bgcolor: 'rgba(15, 23, 42, 0.72)' } },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: { xs: 1.5, sm: 2.5 },
            py: 1.5,
            borderBottom: '1px solid #e8ecf1',
            bgcolor: '#fff',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              color: 'var(--text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
          >
            {modalImage?.caption || 'Activity screenshot'}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
            {modalImage && modalImage.index > 0 && (
              <IconButton size="small" onClick={prevImage} aria-label="Previous image" sx={{ color: '#5c6b82' }}>
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
            )}
            {modalImage && modalImage.index < modalImage.images.length - 1 && (
              <IconButton size="small" onClick={nextImage} aria-label="Next image" sx={{ color: '#5c6b82' }}>
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton size="small" onClick={closeModal} aria-label="Close preview" sx={{ color: '#5c6b82' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <DialogContent
          sx={{
            p: '0 !important',
            bgcolor: '#f4f6f9',
            position: 'relative',
            overflow: 'hidden',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {modalImage && modalImage.index > 0 && (
            <IconButton
              onClick={prevImage}
              aria-label="Previous image"
              sx={{
                position: 'absolute',
                top: '50%',
                left: { xs: 8, sm: 16 },
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'var(--primary)',
                border: '1px solid #dce3ec',
                boxShadow: '0 4px 12px rgba(26, 43, 61, 0.12)',
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                '&:hover': { bgcolor: '#fff' },
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
                right: { xs: 8, sm: 16 },
                transform: 'translateY(-50%)',
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.95)',
                color: 'var(--primary)',
                border: '1px solid #dce3ec',
                boxShadow: '0 4px 12px rgba(26, 43, 61, 0.12)',
                width: { xs: 36, sm: 44 },
                height: { xs: 36, sm: 44 },
                '&:hover': { bgcolor: '#fff' },
              }}
            >
              <ChevronRightIcon />
            </IconButton>
          )}

          <Box
            sx={{
              flex: '1 1 auto',
              width: '100%',
              minWidth: 0,
              minHeight: 0,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              p: 1,
            }}
          >
            {modalImage?.images[modalImage.index] && !imageError ? (
              <Box
                component="img"
                src={modalImage.images[modalImage.index]}
                alt={`Preview ${modalImage.index + 1}`}
                onError={() => setImageError(true)}
                sx={{
                  flex: 1,
                  width: '100%',
                  height: '100%',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  bgcolor: '#fff',
                  borderRadius: 1,
                  border: '1px solid #dce3ec',
                  boxShadow: '0 8px 24px rgba(26, 43, 61, 0.08)',
                }}
              />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  width: '100%',
                  bgcolor: '#e8ecf1',
                  color: 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 1,
                  border: '1px solid #dce3ec',
                  fontWeight: 600,
                  fontSize: { xs: '0.95rem', sm: '1.05rem' },
                }}
              >
                No Image Available
              </Box>
            )}
          </Box>

          {modalImage && (
            <Box
              sx={{
                px: { xs: 2, sm: 2.5 },
                py: 1.25,
                borderTop: '1px solid #e8ecf1',
                bgcolor: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexShrink: 0,
                width: '100%',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                {modalImage.caption || 'Screenshot'}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'var(--muted)', fontWeight: 600 }}>
                {modalImage.index + 1} / {modalImage.images.length}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
