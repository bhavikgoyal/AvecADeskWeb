import React, { useEffect, useState } from "react";
import Sidebar from "../Sidebar";
import MembersTable from "./MembersTable";
import { useNavigate } from "react-router-dom";
import { Session } from "../../utils/session";

export default function MembersContent() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [hideDesktop, setHideDesktop] = useState(true);
  const navigate = useNavigate();
  const role = Session.getRole();
  const isTeamLeader = role === "Team Leader";
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => {
    if (window.innerWidth <= 991) {
      setShowMobileSidebar((s) => !s);
    } else {
      setHideDesktop((s) => !s);
    }
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 991) {
        setShowMobileSidebar(false);
      }
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Sidebar logic - useEffect for direct DOM manipulation
  useEffect(() => {
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
      overlay.style.display = showMobileSidebar ? 'block' : 'none';
    }
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (showMobileSidebar) sidebar.classList.add('show-mobile'); else sidebar.classList.remove('show-mobile');
      if (hideDesktop) sidebar.classList.add('hide-desktop'); else sidebar.classList.remove('hide-desktop');
    }
    const content = document.getElementById('content');
    if (content) {
      if (hideDesktop) content.classList.add('full-width'); else content.classList.remove('full-width');
    }
  }, [showMobileSidebar, hideDesktop]);

  useEffect(() => {
  const content = document.getElementById("content");

  if (content) {
    content.classList.add("full-width");
  }
}, []);

  return (
    <div>
      {/* Overlay for mobile sidebar - always rendered, visibility controlled by useEffect */}
      <div id="sidebar-overlay" className="sidebar-overlay" onClick={() => setShowMobileSidebar(false)} />
      {/* <div id="sidebar">
        <Sidebar />
      </div> */}
      <div
  id="content"
  style={{
    width: "100%",
    minWidth: 0
  }}
>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Members</h2>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {/* Search Bar */}
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14
      }}>🔍</span>
      <input
        type="text"
        placeholder="Search members..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          paddingLeft: 32, paddingRight: 12,
          paddingTop: 8, paddingBottom: 8,
          border: '1px solid #e2e8f0', borderRadius: 8,
          fontSize: '0.875rem', color: '#1e293b',
          background: '#fff', outline: 'none',
          width: 220
        }}
      />
    </div>
    {/* + Button */}
    {!isTeamLeader && (
      <button
        onClick={() => navigate("/Members/Create")}
        style={{
          backgroundColor: "#0084fe", color: "white",
          width: 36, height: 36, border: "none",
          borderRadius: "50%", fontSize: '1.2rem',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}
      >+</button>
    )}
  </div>
</div>

<div className="main-card">

 <MembersTable searchQuery={searchQuery} />
</div>
        </div>
      </div>
   
  );
}
