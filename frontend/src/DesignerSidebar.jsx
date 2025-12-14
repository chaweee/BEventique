import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, MessageSquare, LogOut } from 'lucide-react';
import './DesignerSidebar.css';

/* DesignerSidebar: shared sidebar for designer pages */
export default function DesignerSidebar({ onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const isActive = (path) => {
    return location.pathname.includes(path) ? 'active' : '';
  };

  return (
    <aside className="designer-sidebar">
      <div className="sidebar-header">
        <h2>Designer Panel</h2>
        <p>Baby's Eventique</p>
      </div>
      <nav className="sidebar-nav">
        <button 
          className={isActive('designer-packages')} 
          onClick={() => navigate('/designer-packages')}
        >
          <Package size={18} className="sidebar-icon" />
          Manage Packages
        </button>
        <button 
          className={isActive('designer-queries')} 
          onClick={() => navigate('/designer-queries')}
        >
          <MessageSquare size={18} className="sidebar-icon" />
          Design Queries
        </button>
      </nav>
      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} className="sidebar-icon" />
        Logout
      </button>
    </aside>
  );
}
