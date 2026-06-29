import { Box, Typography, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

import MembersTable from './MembersTable';

export default function MembersContent() {

  const navigate = useNavigate();

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 800,
            color: "var(--text)",
          }}
        >
          Members
        </Typography>

      <Button
  variant="contained"
  onClick={() => navigate("/Members/Create")}
  sx={{
    backgroundColor: "#2F80C9",
    color: "#fff",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "14px",
    borderRadius: "8px",
    px: 3,
    py: 1,
    boxShadow: "0 3px 8px rgba(47, 128, 201, 0.35)",

    "&:hover": {
      backgroundColor: "#2874B8",
      boxShadow: "0 4px 10px rgba(47, 128, 201, 0.45)",
    },
  }}
>
  Add Member
</Button>
      </Box>

      <MembersTable />

    </Box>
  );
}