import React from "react";
import AdminSidebar from "./AdminSidebar";
import ManagePayments from "./ManagePayments";
import "./AdminDashboard.css";

export default function AdminManagePaymentsPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Payments</h1>
          <div className="user-profile">Administrator</div>
        </header>
        <div className="content-body">
          <ManagePayments />
        </div>
      </main>
    </div>
  );
}
