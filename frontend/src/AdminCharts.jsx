import React from "react";
import { PieChart, BarChart } from '@mui/x-charts';

export function PaymentStatusChart({ payments }) {
  const paid = payments.filter(p => Number(p.amount_paid || 0) >= Number(p.amount_due || 0)).length;
  const unpaid = payments.length - paid;
  const data = [
    { id: 0, value: paid, label: 'Paid' },
    { id: 1, value: unpaid, label: 'Unpaid' }
  ];
  return (
    <PieChart
      series={[{
        data,
        innerRadius: 40,
        outerRadius: 80,
        paddingAngle: 2,
        cornerRadius: 5,
        colors: ['#10b981', '#f59e42'],
        valueFormatter: v => v.value,
      }]}
      width={320}
      height={250}
      legend={{ hidden: false }}
    />
  );
}

export function QueryMessageChart({ threads }) {
  const total = threads.length;
  const withMessages = threads.filter(t => t.unread_count > 0 || (t.messages && t.messages.length > 0)).length;
  const noMessages = total - withMessages;
  const data = [
    { id: 0, value: withMessages, label: 'With Messages' },
    { id: 1, value: noMessages, label: 'No Messages' }
  ];
  return (
    <PieChart
      series={[{
        data,
        innerRadius: 40,
        outerRadius: 80,
        paddingAngle: 2,
        cornerRadius: 5,
        colors: ['#3b82f6', '#e5e7eb'],
        valueFormatter: v => v.value,
      }]}
      width={320}
      height={250}
      legend={{ hidden: false }}
    />
  );
}

export function BookingStatusBarChart({ statusDistribution }) {
  const data = statusDistribution.map((s, i) => ({ id: i, status: s.status, count: s.count }));
  return (
    <BarChart
      series={[{ data: data.map(d => d.count), label: 'Bookings', color: '#7a4a13' }]}
      xAxis={[{ data: data.map(d => d.status), scaleType: 'band', label: 'Status' }]}
      width={400}
      height={250}
      legend={{ hidden: false }}
    />
  );
}
