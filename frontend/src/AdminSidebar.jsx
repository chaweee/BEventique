import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, DollarSign, MessageSquare, LogOut } from "lucide-react";
import "./AdminDashboard.css";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
        <p>Baby's Eventique</p>
      </div>
      <nav className="sidebar-nav">
        <button 
          className={isActive("/admin-dashboard")} 
          onClick={() => navigate("/admin-dashboard")}
        >
          <Home size={18} className="sidebar-icon" />
          Dashboard
        </button>
        <button 
          className={isActive("/admin/manage-events")} 
          onClick={() => navigate("/admin/manage-events")}
        >
          <Calendar size={18} className="sidebar-icon" />
          Manage Schedule
        </button>
        <button 
          className={isActive("/admin/manage-payments")} 
          onClick={() => navigate("/admin/manage-payments")}
        >
          <DollarSign size={18} className="sidebar-icon" />
          Manage Payments
        </button>
        <button 
          className={isActive("/admin/customer-queries")} 
          onClick={() => navigate("/admin/customer-queries")}
        >
          <MessageSquare size={18} className="sidebar-icon" />
          Customer Queries
        </button>
      </nav>
      <button className="sidebar-logout" onClick={handleLogout}>
        <LogOut size={18} className="sidebar-icon" />
        Logout
      </button>
    </aside>
  );
}
