export const NAV_LINKS = [
  { label: 'Home', path: '#home', active: true },
  { label: 'About Us', path: '#about' },
  { label: 'Universities', path: '#universities' },
  { label: 'Courses', path: '#courses' },
  { label: 'Destinations', path: '#destinations' },
  { label: 'Services', path: '#services' },
  { label: 'Blog', path: '#blog' },
  { label: 'Contact Us', path: '#contact' },
];

export const FILTER_OPTIONS = {
  country: ['Australia', 'Canada', 'UK', 'USA', 'France', 'Ireland'],
  studyLevel: ['Undergraduate', 'Postgraduate', 'PhD', 'Diploma'],
  intake: ['January 2026', 'May 2026', 'September 2026'],
  campus: ['On Campus', 'Online', 'Hybrid'],
};

export const PARTNER_INSTITUTE = {
  name: 'EM Normandie Business School',
  tagline: 'A Top Ranked International Business School',
  stats: [
    { icon: 'calendar', label: 'Founded', value: '1871' },
    { icon: 'verified', label: 'AACSB', value: 'Accredited' },
    { icon: 'public', label: '5 Campuses', value: 'Worldwide' },
  ],
  locations: ['Paris', 'Le Havre', 'Dublin', 'Dubai'],
  image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
};

export const POPULAR_COURSES = [
  {
    id: 1,
    title: 'Master in Business Administration',
    campus: 'Paris Campus',
    intake: 'September 2026 Intake',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 2,
    title: 'MSc in Finance',
    campus: 'Le Havre Campus',
    intake: 'September 2026 Intake',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 3,
    title: 'MSc in Marketing',
    campus: 'Dublin Campus',
    intake: 'September 2026 Intake',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
  },
];

export const WHY_CHOOSE = [
  { title: 'Expert Guidance', subtitle: 'from admission to visa & beyond', icon: 'school' },
  { title: '1000+ Institutions', subtitle: 'worldwide', icon: 'account_balance' },
  { title: 'Study in 25+ Countries', subtitle: 'global opportunities', icon: 'public' },
  { title: 'End-to-End Support', subtitle: 'for a hassle-free journey', icon: 'groups' },
  { title: 'High Visa Success Rate', subtitle: 'trusted outcomes', icon: 'emoji_events' },
];
