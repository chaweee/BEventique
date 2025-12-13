import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import "./AdminDashboard.css";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ 
    total_bookings: 0, 
    total_accounts: 0, 
    total_customers: 0, 
    revenue: 0, 
    status_distribution: [] 
  });

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

  const getTotalBookings = () => {
    return stats.status_distribution.reduce((sum, item) => sum + item.count, 0);
  };

  const getStatusCount = (status) => {
    const item = stats.status_distribution.find(s => s.status === status);
    return item ? item.count : 0;
  };

  const getStatusPercentage = (status) => {
    const total = getTotalBookings();
    if (total === 0) return 0;
    const count = getStatusCount(status);
    return ((count / total) * 100).toFixed(1);
  };

  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <AdminContentHeader title="Dashboard" />
        <div className="content-body">
          <div className="dashboard-grid">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p>₱{Number(stats.revenue).toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Total Bookings</h3>
              <p>{getTotalBookings()}</p>
            </div>
            <div className="stat-card">
              <h3>Total Accounts</h3>
              <p>{stats.total_accounts}</p>
            </div>
            <div className="stat-card">
              <h3>Total Customers</h3>
              <p>{stats.total_customers}</p>
            </div>
          </div>

          <div className="status-distribution">
            <h3>Booking Status Distribution</h3>
            {["pending", "confirmed", "completed", "cancelled"].map((status) => (
              <div key={status} className="status-bar">
                <div className="status-label">
                  <span style={{ textTransform: "capitalize" }}>{status}</span>
                  <span>{getStatusCount(status)} ({getStatusPercentage(status)}%)</span>
                </div>
                <div className="status-bar-container">
                  <div 
                    className={`status-bar-fill ${status}`}
                    style={{ width: `${getStatusPercentage(status)}%` }}
                  >
                    {getStatusPercentage(status) > 5 && `${getStatusPercentage(status)}%`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
