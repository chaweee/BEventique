import React, { useState, useEffect } from "react";

export default function ManagePayments() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/admin/payments");
      const data = await res.json();
      if (data.status === "success") setPayments(data.payments);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Client</th>
            <th>Amount Due</th>
            <th>Payment Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.booking_id}>
              <td>#{p.booking_id}</td>
              <td>{p.client_name}</td>
              <td className="amount">₱{Number(p.total_amount).toLocaleString()}</td>
              <td>
                {['confirmed', 'completed'].includes(p.booking_status) 
                  ? <span className="badge completed">Paid</span>
                  : <span className="badge pending">Unpaid / Pending</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
