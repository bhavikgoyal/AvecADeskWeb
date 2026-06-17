import { useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Container,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import VerifiedIcon from '@mui/icons-material/Verified';
import PublicIcon from '@mui/icons-material/Public';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import SchoolIcon from '@mui/icons-material/School';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GroupsIcon from '@mui/icons-material/Groups';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlightIcon from '@mui/icons-material/Flight';
import { Link as RouterLink } from 'react-router-dom';
import {
  FILTER_OPTIONS,
  NAV_LINKS,
  PARTNER_INSTITUTE,
  POPULAR_COURSES,
  WHY_CHOOSE,
} from './portalData';

const LOGO = '/images/login/global_logo.png';

const whyIcons = {
  school: SchoolIcon,
  account_balance: AccountBalanceIcon,
  public: PublicIcon,
  groups: GroupsIcon,
  emoji_events: EmojiEventsIcon,
};

const selectSx = {
  borderRadius: 2,
  bgcolor: '#fff',
  fontSize: '0.875rem',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
};

export default function UserPortal() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ country: '', studyLevel: '', intake: '', campus: '' });

  const updateFilter = (key) => (e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Box sx={{ bgcolor: '#f8fbff', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#fff', borderBottom: '1px solid #e8eef5' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ py: 1, gap: 2 }}>
            <Box component="img" src={LOGO} alt="AVEC GLOBAL" sx={{ height: { xs: 36, md: 44 }, width: 'auto' }} />
            {!isMobile && (
              <Stack direction="row" spacing={2.5} sx={{ flex: 1, justifyContent: 'center' }}>
                {NAV_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    href={item.path}
                    underline="none"
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: item.active ? 700 : 500,
                      color: item.active ? '#1a56a6' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      borderBottom: item.active ? '2px solid #2f80c9' : '2px solid transparent',
                      pb: 0.5,
                    }}
                  >
                    {item.active && <HomeIcon sx={{ fontSize: 16 }} />}
                    {item.label}
                  </Link>
                ))}
              </Stack>
            )}
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              sx={{
                ml: 'auto',
                textTransform: 'none',
                borderRadius: 2,
                px: 2.5,
                bgcolor: '#2f80c9',
                fontWeight: 600,
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': { bgcolor: '#2569a8' },
              }}
            >
              Enquire Now
            </Button>
            {isMobile && (
              <IconButton onClick={() => setMobileNav((p) => !p)} sx={{ ml: 'auto', color: '#1a56a6' }}>
                {mobileNav ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            )}
          </Toolbar>
          {isMobile && mobileNav && (
            <Stack spacing={1} sx={{ pb: 2 }}>
              {NAV_LINKS.map((item) => (
                <Link key={item.label} href={item.path} underline="none" sx={{ color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>
                  {item.label}
                </Link>
              ))}
              <Button variant="contained" endIcon={<ArrowForwardIcon />} sx={{ textTransform: 'none', bgcolor: '#2f80c9' }}>
                Enquire Now
              </Button>
              <Button component={RouterLink} to="/login" variant="outlined" sx={{ textTransform: 'none' }}>
                Staff Login
              </Button>
            </Stack>
          )}
        </Container>
      </AppBar>

      {/* Hero search */}
      <Box
        id="home"
        sx={{
          background: 'linear-gradient(180deg, #dceefb 0%, #eef6fc 45%, #f8fbff 100%)',
          pt: { xs: 4, md: 6 },
          pb: { xs: 5, md: 7 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage: `url("https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=60")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Paper elevation={0} sx={{ p: { xs: 2.5, md: 4 }, borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 12px 40px rgba(26, 86, 166, 0.08)' }}>
            <Typography align="center" sx={{ fontWeight: 800, fontSize: { xs: '1.35rem', md: '1.75rem' }, color: '#0f2d52', mb: 1 }}>
              Find the Right Course &amp; Institution for Your Future
            </Typography>
            <Typography align="center" sx={{ color: '#64748b', fontSize: '0.9rem', mb: 3 }}>
              Search from 1000+ Universities and Programs worldwide
            </Typography>
            <TextField
              fullWidth
              placeholder="Search Course, Specialization, Keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff', height: 48 },
              }}
            />
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              {[
                { key: 'country', label: 'Country', options: FILTER_OPTIONS.country },
                { key: 'studyLevel', label: 'Study Level', options: FILTER_OPTIONS.studyLevel },
                { key: 'intake', label: 'Intake', options: FILTER_OPTIONS.intake },
                { key: 'campus', label: 'Campus', options: FILTER_OPTIONS.campus },
              ].map((f) => (
                <Grid key={f.key} size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <Select displayEmpty value={filters[f.key]} onChange={updateFilter(f.key)} sx={selectSx}>
                      <MenuItem value="">{f.label}</MenuItem>
                      {f.options.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
            </Grid>
            <Button
              fullWidth
              variant="contained"
              startIcon={<SearchIcon />}
              sx={{
                height: 48,
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '1rem',
                bgcolor: '#2f80c9',
                '&:hover': { bgcolor: '#2569a8' },
              }}
            >
              Search Programs
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* Partner institution */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} id="universities">
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: '#d8e2ee' }} />
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.2rem', md: '1.45rem' },
              color: '#0f2d52',
              whiteSpace: 'nowrap',
              px: 1,
            }}
          >
            Our Partner Institution
          </Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: '#d8e2ee' }} />
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            bgcolor: '#fff',
          }}
        >
          <Grid container sx={{ alignItems: 'stretch' }}>
            <Grid size={{ xs: 12, md: 7 }} sx={{ p: { xs: 2.5, md: 3.5 }, zIndex: 1 }}>
              <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    bgcolor: '#b71c1c',
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    borderRadius: 0.5,
                    py: 0.75,
                  }}
                >
                  <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: 0.4, lineHeight: 1 }}>
                    1871
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1.65rem',
                      fontWeight: 700,
                      fontFamily: '"Georgia", "Times New Roman", serif',
                      lineHeight: 1,
                      my: 0.25,
                    }}
                  >
                    EM
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.38rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      lineHeight: 1.15,
                      letterSpacing: 0.2,
                    }}
                  >
                    NORMANDIE
                    <br />
                    BUSINESS SCHOOL
                  </Typography>
                </Box>
                <Box sx={{ pt: 0.25 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.2rem' }, color: '#0f2d52', lineHeight: 1.3 }}>
                    {PARTNER_INSTITUTE.name}
                  </Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mt: 0.5, lineHeight: 1.45 }}>
                    {PARTNER_INSTITUTE.tagline}
                  </Typography>
                </Box>
              </Stack>

              <Stack
                direction="row"
                sx={{
                  mb: 3,
                  borderTop: '1px solid #eef2f7',
                  borderBottom: '1px solid #eef2f7',
                  py: 2,
                }}
              >
                {PARTNER_INSTITUTE.stats.map((stat, index) => {
                  const StatIcon =
                    stat.icon === 'calendar' ? CalendarMonthIcon : stat.icon === 'verified' ? VerifiedIcon : PublicIcon;
                  return (
                    <Box
                      key={stat.label}
                      sx={{
                        flex: 1,
                        textAlign: 'center',
                        px: 1,
                        borderRight: index < PARTNER_INSTITUTE.stats.length - 1 ? '1px solid #e2e8f0' : 'none',
                      }}
                    >
                      <StatIcon sx={{ fontSize: 22, color: '#2f80c9', mb: 0.75 }} />
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500, lineHeight: 1.2 }}>
                        {stat.label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f2d52', mt: 0.25 }}>
                        {stat.value}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>

              <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
                {PARTNER_INSTITUTE.locations.map((loc) => (
                  <Chip
                    key={loc}
                    icon={<PlaceIcon sx={{ fontSize: '15px !important', color: '#2f80c9 !important' }} />}
                    label={loc}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: '#b3d4f0',
                      color: '#1a56a6',
                      bgcolor: '#f8fbff',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      height: 32,
                      '& .MuiChip-label': { px: 0.5 },
                    }}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid
              size={{ xs: 12, md: 5 }}
              sx={{
                position: 'relative',
                minHeight: { xs: 260, md: 300 },
              }}
            >
              <Box
                component="img"
                src={PARTNER_INSTITUTE.image}
                alt={PARTNER_INSTITUTE.name}
                sx={{
                  width: '100%',
                  height: '100%',
                  minHeight: { xs: 260, md: 300 },
                  objectFit: 'cover',
                  display: 'block',
                  clipPath: {
                    xs: 'none',
                    md: 'polygon(12% 0, 100% 0, 100% 100%, 0 100%)',
                  },
                }}
              />
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                sx={{
                  position: 'absolute',
                  bottom: { xs: 20, md: 28 },
                  left: '50%',
                  transform: 'translateX(-50%)',
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: '#fff',
                  color: '#0f2d52',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  px: 2.5,
                  py: 1,
                  boxShadow: '0 4px 20px rgba(15, 45, 82, 0.18)',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: '#f8fafc', boxShadow: '0 6px 24px rgba(15, 45, 82, 0.22)' },
                }}
              >
                View Institute Details
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* Popular courses */}
      <Box sx={{ bgcolor: '#fff', py: { xs: 4, md: 6 } }} id="courses">
        <Container maxWidth="lg">
          <Typography align="center" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' }, color: '#0f2d52', mb: 3 }}>
            Popular Courses at EM Normandie
          </Typography>
          <Grid container spacing={2.5}>
            {POPULAR_COURSES.map((course) => (
              <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia component="img" height="180" image={course.image} alt={course.title} />
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0f2d52', mb: 1.5, lineHeight: 1.35 }}>
                      {course.title}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                      <PlaceIcon sx={{ fontSize: 16, color: '#64748b' }} />
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{course.campus}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2 }}>
                      <CalendarMonthIcon sx={{ fontSize: 16, color: '#64748b' }} />
                      <Typography sx={{ fontSize: '0.8rem', color: '#64748b' }}>{course.intake}</Typography>
                    </Stack>
                    <Divider sx={{ mb: 1.5 }} />
                    <Button
                      endIcon={<ArrowForwardIcon />}
                      sx={{ alignSelf: 'flex-start', textTransform: 'none', color: '#2f80c9', fontWeight: 700, p: 0 }}
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="outlined"
              endIcon={<ArrowForwardIcon />}
              sx={{ textTransform: 'none', borderRadius: 2, px: 3, borderColor: '#2f80c9', color: '#2f80c9', fontWeight: 700 }}
            >
              View All Courses
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Why choose */}
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }} id="about">
        <Typography align="center" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' }, color: '#0f2d52', mb: 4 }}>
          Why Students Choose AVEC Global
        </Typography>
        <Grid container spacing={3}>
          {WHY_CHOOSE.map((item) => {
            const Icon = whyIcons[item.icon];
            return (
              <Grid key={item.title} size={{ xs: 12, sm: 6, md: 4, lg: 2.4 }}>
                <Stack alignItems="center" textAlign="center" spacing={1}>
                  <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#e8f3fc', display: 'grid', placeItems: 'center' }}>
                    <Icon sx={{ color: '#2f80c9', fontSize: 28 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f2d52' }}>{item.title}</Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>{item.subtitle}</Typography>
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </Container>

      {/* Footer CTA */}
      <Box
        id="contact"
        sx={{
          bgcolor: '#1a4d8c',
          color: '#fff',
          py: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <FlightIcon sx={{ position: 'absolute', right: { xs: 16, md: 48 }, top: '50%', transform: 'translateY(-50%)', fontSize: 48, opacity: 0.15 }} />
        <Container maxWidth="lg">
          <Grid container spacing={2} alignItems="center" justifyContent="center">
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-start' }}>
                <PhoneIcon />
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', opacity: 0.9 }}>Talk to Our Education Experts</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>+91 98765 43210</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.25)', mx: 'auto', height: 48 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ xs: 'center', md: 'flex-end' }}>
                <EmailIcon />
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', opacity: 0.9 }}>Email Us</Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>info@avecglobal.com</Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box sx={{ py: 2, textAlign: 'center', bgcolor: '#f8fbff' }}>
        <Button component={RouterLink} to="/login" size="small" sx={{ textTransform: 'none', color: '#2f80c9', fontWeight: 600 }}>
          ← Back to Staff Login
        </Button>
      </Box>
    </Box>
  );
}
