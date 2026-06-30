import { useState } from "react";
import { Box, Typography, Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";

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
      {/* Page Heading */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 800,
          color: "var(--text)",
          mb: 2,
        }}
      >
        Members
      </Typography>

      {/* Search + Add Button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search Members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            backgroundColor: "#fff",

            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
            },
          }}
        />

        <Button
          variant="contained"
        
          onClick={() => navigate("/Members/Create")}
          sx={{
            minWidth: "170px",
            height: "40px",
            backgroundColor: "#2F80C9",
            color: "#fff",
            textTransform: "none",
            fontWeight: 600,
            fontSize: "14px",
            borderRadius: "8px",
            whiteSpace: "nowrap",
            boxShadow: "0 3px 8px rgba(47,128,201,0.35)",

            "&:hover": {
              backgroundColor: "#2874B8",
              boxShadow: "0 4px 10px rgba(47,128,201,0.45)",
            },
          }}
        >
          Add Member
        </Button>
      </Box>

      {/* Members Table */}
      <MembersTable searchQuery={searchQuery} />
    </Box>
  );
}