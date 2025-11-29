import React from 'react';
import { Sidebar, Menu, MenuItem } from 'react-mui-sidebar';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';
import './DesignerSidebar.css';

/* DesignerSidebar: shared sidebar for designer pages */
export default function DesignerSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isPackages = location.pathname.includes('designer-packages');
  const isQueries = location.pathname.includes('designer-queries');

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="designer-sidebar">
      <Sidebar width={250} background={"linear-gradient(180deg,#2c3e50 0%, #34495e 100%)"} color="rgba(255,255,255,0.85)">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Designer Panel</h2>
        </div>
        <Menu hideHeading>
          <MenuItem
            icon={<ViewCarouselIcon />}
            component={RouterLink}
            link="/designer-packages"
            isSelected={isPackages}
          >
            Manage Packages
          </MenuItem>
          <MenuItem
            icon={<ChatBubbleOutlineIcon />}
            component={RouterLink}
            link="/designer-queries"
            isSelected={isQueries}
          >
            Design Queries
          </MenuItem>
          <MenuItem icon={<LogoutIcon />} onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
        <div className="sidebar-footer">
          © 2025 Baby's Eventique
        </div>
      </Sidebar>
    </div>
  );
}
