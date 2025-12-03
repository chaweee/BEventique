import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import "./AdminDashboard.css";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ total_bookings: 0, pending_bookings: 0, revenue: 0, total_users: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/stats");
      const data = await res.json();
      if (data.status === "success") setStats(data.stats);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Dashboard</h1>
          <div className="user-profile">Administrator</div>
        </header>
        <div className="content-body">
          <div className="dashboard-grid">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p>₱{Number(stats.revenue).toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Total Bookings</h3>
              <p>{stats.total_bookings}</p>
            </div>
            <div className="stat-card warning">
              <h3>Pending Requests</h3>
              <p>{stats.pending_bookings}</p>
            </div>
            <div className="stat-card">
              <h3>Registered Users</h3>
              <p>{stats.total_users}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
