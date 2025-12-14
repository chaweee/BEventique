import React, { useMemo } from "react";
import { useTheme } from '@mui/material/styles';
import { PieChart, LineChart } from '@mui/x-charts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// Utility: safe number
const n = v => Number(v || 0);

export function PaymentStatusChart({ payments = [] }) {
  const theme = useTheme();
  const paid = payments.filter(p => n(p.amount_paid) >= n(p.amount_due)).length;
  const unpaid = payments.length - paid;
  const partial = payments.filter(p => n(p.amount_paid) > 0 && n(p.amount_paid) < n(p.amount_due)).length;
  const data = [
    { id: 0, value: paid, label: 'Paid' },
    { id: 1, value: partial, label: 'Partial' },
    { id: 2, value: unpaid, label: 'Unpaid' }
  ];
  const colors = [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.light];
  return (
    <PieChart
      series={[{
        data,
        innerRadius: 48,
        outerRadius: 88,
        paddingAngle: 2,
        cornerRadius: 6,
        colors,
        valueFormatter: v => v.value,
      }]}
      width={360}
      height={260}
      legend={{ hidden: false }}
    />
  );
}

export function QueryMessageChart({ threads = [] }) {
  const theme = useTheme();
  const total = threads.length || 0;
  const withMessages = threads.filter(t => (t.unread_count && t.unread_count > 0) || (t.messages && t.messages.length > 0)).length;
  const noMessages = total - withMessages;
  const data = [
    { id: 0, value: withMessages, label: 'With Messages' },
    { id: 1, value: noMessages, label: 'No Messages' }
  ];
  const colors = [theme.palette.primary.main, theme.palette.grey[300]];
  return (
    <PieChart
      series={[{
        data,
        innerRadius: 44,
        outerRadius: 84,
        paddingAngle: 2,
        cornerRadius: 6,
        colors,
        valueFormatter: v => v.value,
      }]}
      width={360}
      height={260}
      legend={{ hidden: false }}
    />
  );
}

export function BookingStatusBarChart({ statusDistribution = [], barColors }) {
  const theme = useTheme();
  const labels = statusDistribution.map(d => d.status || 'Unknown');
  const counts = statusDistribution.map(d => n(d.count));
  // Default colors if not provided
  const colorMap = barColors || {
    pending: "#facc15",
    confirmed: "#3b82f6",
    completed: "#22c55e"
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={statusDistribution}>
        <XAxis dataKey="status" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name="Bookings">
          {statusDistribution.map((entry, idx) => (
            <Cell
              key={`cell-${idx}`}
              fill={colorMap[entry.status] || "#2563eb"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueLineChart({ payments = [] }) {
  const theme = useTheme();
  // Try to aggregate by month if payment.created_at exists, otherwise fallback to sequential sample
  const series = useMemo(() => {
    if (payments.length && payments[0].created_at) {
      const map = {};
      payments.forEach(p => {
        const d = new Date(p.created_at);
        if (isNaN(d)) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        map[key] = (map[key] || 0) + n(p.amount_paid);
      });
      const labels = Object.keys(map).sort();
      return { labels, values: labels.map(l => map[l]) };
    }
    // fallback: distribute totals across 6 points
    const total = payments.reduce((s,p) => s + n(p.amount_paid), 0);
    const values = [0.1,0.2,0.4,0.6,0.8,1.0].map(f => Math.round(total * f));
    return { labels: ['Jan','Feb','Mar','Apr','May','Jun'], values };
  }, [payments]);

  return (
    <LineChart
      series={[{ data: series.values, label: 'Revenue', color: theme.palette.secondary.main }]}
      xAxis={[{ data: series.labels, label: 'Period' }]}
      width={640}
      height={260}
      legend={{ hidden: false }}
    />
  );
}

export function BookingsAreaChart({ bookings = [] }) {
  const theme = useTheme();
  // bookings: expect objects with `date` or fallback to sample last-7-days
  const series = useMemo(() => {
    if (bookings.length && bookings[0].date) {
      const map = {};
      bookings.forEach(b => {
        const d = new Date(b.date);
        if (isNaN(d)) return;
        const key = d.toISOString().slice(0,10);
        map[key] = (map[key] || 0) + 1;
      });
      const labels = Object.keys(map).sort();
      return { labels, values: labels.map(l => map[l]) };
    }
    // fallback sample
    const labels = ['-6d','-5d','-4d','-3d','-2d','-1d','today'];
    const values = [2,3,1,5,4,6,3];
    return { labels, values };
  }, [bookings]);

  // Use LineChart with bookings series (visual similar to area when filled by CSS or plugins)
  return (
    <LineChart
      series={[{ data: series.values, label: 'Bookings', color: theme.palette.success.main }]}
      xAxis={[{ data: series.labels, label: 'Day' }]}
      width={640}
      height={260}
      legend={{ hidden: false }}
    />
  );
}

export function PaymentsDonutChart({ payments = [] }) {
  const theme = useTheme();
  const paid = payments.filter(p => n(p.amount_paid) >= n(p.amount_due)).length;
  const partial = payments.filter(p => n(p.amount_paid) > 0 && n(p.amount_paid) < n(p.amount_due)).length;
  const overdue = payments.filter(p => p.due_date && (new Date(p.due_date) < new Date()) && n(p.amount_paid) < n(p.amount_due)).length;
  const data = [
    { id: 0, value: paid, label: 'Paid' },
    { id: 1, value: partial, label: 'Partial' },
    { id: 2, value: overdue, label: 'Overdue' }
  ];
  const colors = [theme.palette.success.dark, theme.palette.warning.dark, theme.palette.error.main];
  return (
    <PieChart
      series={[{ data, innerRadius: 56, outerRadius: 90, colors, paddingAngle: 2, cornerRadius: 6 }]}
      width={380}
      height={300}
      legend={{ hidden: false }}
    />
  );
}

const CHARTS = {
  PaymentStatusChart,
  QueryMessageChart,
  BookingStatusBarChart,
  RevenueLineChart,
  BookingsAreaChart,
  PaymentsDonutChart,
};

export default CHARTS;
