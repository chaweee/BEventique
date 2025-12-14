import React, { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import { PaymentStatusChart, QueryMessageChart, BookingStatusBarChart } from "./AdminCharts";
import "./AdminDashboard.css";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ 
    total_bookings: 0, 
    total_accounts: 0, 
    total_customers: 0, 
    revenue: 0, 
    status_distribution: [],
    payments: [],
    queries: []
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/stats");
      const data = await res.json();
      if (data.status === "success") {
        // Fetch payments and queries for charts
        const paymentsRes = await fetch("http://localhost:3001/api/admin/payments");
        const paymentsData = await paymentsRes.json();
        const queriesRes = await fetch("http://localhost:3001/api/queries/all");
        const queriesData = await queriesRes.json();
        setStats({
          ...data.stats,
          payments: paymentsData.status === "success" ? paymentsData.payments : [],
          queries: queriesData.status === "success" ? queriesData.threads : []
        });
      }
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

          <div className="dashboard-charts" style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 32 }}>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Payment Status</h4>
              <PaymentStatusChart payments={stats.payments} />
            </div>
            <div style={{ flex: 1, minWidth: 320, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Query Messages</h4>
              <QueryMessageChart threads={stats.queries} />
            </div>
            <div style={{ flex: 2, minWidth: 400, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0001', padding: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Booking Status Distribution</h4>
              <BookingStatusBarChart statusDistribution={stats.status_distribution} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
