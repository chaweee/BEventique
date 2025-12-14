import React, { useState, useEffect, useMemo } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import { PaymentStatusChart, BookingStatusBarChart } from "./AdminCharts";
// --- Imports for Charts ---
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// --- Imports for Scheduler (Calendar) ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css'; // Standard CSS

import "./AdminDashboard.css";

// --- Scheduler Setup ---
const locales = {
  'en-US': enUS,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- Dummy Events for the Scheduler (Demo Data) ---
const myEventsList = [
  {
    title: 'All Day Event',
    allDay: true,
    start: new Date(2025, 11, 1), 
    end: new Date(2025, 11, 1),
  },
];

// --- Error Boundary for charts ---
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('Chart render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, borderRadius: 8, background: '#fff6f6', color: '#a00' }}>
          <strong>Chart unavailable</strong>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ 
    total_bookings: 0, 
    total_accounts: 0, 
    total_customers: 0, 
    revenue: 0, 
    status_distribution: [],
    payments: []
  });
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchBookingsForScheduler();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/stats");
      const data = await res.json();
      if (data.status === "success") {
        const paymentsRes = await fetch("http://localhost:3001/api/admin/payments");
        const paymentsData = await paymentsRes.json();
        
        setStats({
          ...data.stats,
          payments: paymentsData.status === "success" ? paymentsData.payments : []
        });
      }
    } catch (err) { console.error(err); }
  };

  // --- UPDATED FUNCTION: Force End Time to Midnight (Next Day) ---
  const fetchBookingsForScheduler = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/bookings");
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.bookings)) {
        
        const mappedEvents = data.bookings.map(booking => {
          // 1. Parse Start Date (e.g. "2023-10-27 06:00:00")
          const dateStr = booking.booking_date || booking.event_date || booking.date || booking.created_at;
          const startDate = new Date(dateStr);
          
          // 2. CALCULATE END TIME MANUALLY
          // Since you don't have an end_time in DB, we create one.
          // We clone the start date...
          let endDate = new Date(startDate);
          
          // ...set the time to 00:00:00 (Midnight)...
          endDate.setHours(0, 0, 0, 0);
          
          // ...and add 1 Day to it.
          // Result: If start is Oct 27 6am, End becomes Oct 28 00:00am.
          endDate.setDate(endDate.getDate() + 1);

          return {
            title: `${booking.customer_name || booking.client_name || 'Booking'}${booking.event_type ? ' - ' + booking.event_type : ''}`,
            start: startDate,
            end: endDate, // Use our manually calculated midnight
            allDay: false,
            resource: booking
          };
        });
        
        setCalendarEvents(mappedEvents);
      }
    } catch (err) {
      console.error("Failed to fetch bookings for scheduler:", err);
    }
  };

  const getTotalBookings = () => {
    return stats.status_distribution.reduce((sum, item) => sum + item.count, 0);
  };

  // --- REVENUE DATA (Area Chart) ---
  const revenueData = useMemo(() => {
    if ((!stats.payments || stats.payments.length === 0) && stats.revenue > 0) {
      return [{ date: 'Start', revenue: 0 }, { date: 'Today', revenue: Number(stats.revenue) }];
    }
    if (!stats.payments) return [];

    const validPayments = stats.payments
      .filter(p => !isNaN(new Date(p.payment_date || p.created_at || p.date).getTime()))
      .sort((a, b) => new Date(a.payment_date || a.date) - new Date(b.payment_date || b.date));

    if (validPayments.length === 0 && stats.revenue > 0) {
       return [{ date: 'Start', revenue: 0 }, { date: 'Today', revenue: Number(stats.revenue) }];
    }

    let runningTotal = 0;
    const dataPoints = validPayments.map(payment => {
      runningTotal += parseFloat(payment.amount || 0);
      return {
        date: new Date(payment.payment_date || payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: runningTotal
      };
    });

    if (dataPoints.length > 0 && dataPoints[dataPoints.length - 1].revenue < Number(stats.revenue)) {
       dataPoints.push({ date: 'Today', revenue: Number(stats.revenue) });
    }

    return dataPoints; 
  }, [stats.payments, stats.revenue]);

  // --- CUSTOMER DATA (Bar Chart) ---
  const customerData = useMemo(() => {
    if (!stats.payments || stats.payments.length === 0) return [];
    const validPayments = stats.payments
      .filter(p => !isNaN(new Date(p.payment_date || p.created_at || p.date).getTime()));
    const dateMap = {};
    validPayments.forEach(p => {
      const dateStr = new Date(p.payment_date || p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
    });
    const dataPoints = Object.keys(dateMap).map(date => ({ date, count: dateMap[date] }));
    if (dataPoints.length === 0 && stats.total_customers > 0) {
      return [{ date: 'Today', count: stats.total_customers }];
    }
    return dataPoints;
  }, [stats.payments, stats.total_customers]);

  // --- STYLES ---
  const rootStyle = {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden", 
    backgroundColor: "#f9fafb" 
  };

  const contentStyle = {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden", 
    display: "flex",
    flexDirection: "column",
  };

  const chartRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", 
    gap: "24px",
    paddingBottom: "24px" 
  };

  const cardStyle = {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", 
    display: "flex",
    flexDirection: "column",
    minWidth: 0, 
    overflow: "hidden" 
  };

  return (
    <div className="admin-root" style={rootStyle}>
      <AdminSidebar />
      
      <main className="admin-content" style={contentStyle}>
        <AdminContentHeader title="Dashboard" />
        
        <div className="content-body" style={{ padding: "24px", width: "100%", boxSizing: "border-box" }}>
          
          {/* Top Stats Cards */}
          <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <p>₱{Number(stats.revenue).toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <h3>Total Bookings</h3>
              <p>{getTotalBookings()}</p>
            </div>
          </div>

          {/* === ROW 1: Payment & Booking Charts === */}
          <div className="chart-row-top" style={chartRowStyle}>
            {/* 1. Payment Status */}
            <div style={cardStyle}>
              <h4 style={{ marginBottom: 20, color: '#111827', fontWeight: 600 }}>Payment Status</h4>
              <ChartErrorBoundary>
                <div style={{ height: 300, width: "100%" }}>
                  <PaymentStatusChart payments={stats.payments} />
                </div>
              </ChartErrorBoundary>
            </div>

            {/* 2. Booking Status */}
            <div style={cardStyle}>
              <h4 style={{ marginBottom: 20, color: '#111827', fontWeight: 600 }}>Booking Status</h4>
              <ChartErrorBoundary>
                <div style={{ height: 300, width: "100%" }}>
                  <BookingStatusBarChart
                    statusDistribution={stats.status_distribution}
                    barColors={{ pending: "#facc15", confirmed: "#3b82f6", completed: "#22c55e" }}
                  />
                </div>
              </ChartErrorBoundary>
            </div>
          </div>


          {/* === MIDDLE: SCHEDULER === */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ ...cardStyle, height: '600px', overflow: 'auto' }}>
              <h4 style={{ marginBottom: 20, color: '#111827', fontWeight: 600 }}>Event Scheduler</h4>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 500 }}
                views={['month', 'week', 'day']}
              />
            </div>
          </div>


          {/* === ROW 2: Revenue & Customer Charts === */}
          <div className="chart-row-bottom" style={chartRowStyle}>
            {/* 3. Net Revenue */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h4 style={{ margin: 0, color: '#111827', fontWeight: 600 }}>Net Revenue</h4>
                <span style={{ fontSize: '12px', color: '#22c55e', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px', fontWeight: 500 }}>
                  Live Data
                </span>
              </div>
              <ChartErrorBoundary>
                <div style={{ height: 300, width: "100%", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(val) => `₱${val/1000}k`} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Revenue"]} />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartErrorBoundary>
            </div>

            {/* 4. Total Customers */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 20 }}>
                <h4 style={{ margin: 0, color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Total Customers</h4>
                <span style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
                  {stats.total_customers}
                </span>
              </div>
              <ChartErrorBoundary>
                <div style={{ height: 260, width: "100%", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={customerData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(value) => [value, "New Customers"]} />
                      <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartErrorBoundary>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}