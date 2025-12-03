import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
          Dashboard
        </button>
        <button 
          className={isActive("/admin/manage-events")} 
          onClick={() => navigate("/admin/manage-events")}
        >
          Manage Schedule
        </button>
        <button 
          className={isActive("/admin/manage-payments")} 
          onClick={() => navigate("/admin/manage-payments")}
        >
          Manage Payments
        </button>
        <button 
          className={isActive("/admin/customer-queries")} 
          onClick={() => navigate("/admin/customer-queries")}
        >
          Customer Queries
        </button>
      </nav>
      <button className="sidebar-logout" onClick={handleLogout}>Logout</button>
    </aside>
  );
}
