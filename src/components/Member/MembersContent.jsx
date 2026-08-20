import { useState } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { listContainedButtonSx, listSearchFieldSx, listToolbarRowSx } from "../forms";

import MembersTable from "./MembersTable";

export default function MembersContent() {
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: "var(--text)",
          mb: 1.5,
        }}
      >
        Members
      </Typography>

      <Paper
        elevation={0}
        sx={{
          border: "1px solid var(--card-border)",
          borderRadius: 2,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <Box sx={{ px: 2, py: 2, borderBottom: "1px solid var(--card-border)" }}>
          <Box sx={listToolbarRowSx}>
            <TextField
              size="small"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={listSearchFieldSx}
            />

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => navigate("/Members/Create")}
              sx={listContainedButtonSx}
            >
              Add Member
            </Button>
          </Box>
        </Box>

        <MembersTable searchQuery={searchQuery} />
      </Paper>
    </Box>
  );
}
