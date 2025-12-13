import React from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import ManagePayments from "./ManagePayments";
import "./AdminDashboard.css";

export default function AdminManagePaymentsPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <AdminContentHeader title="Manage Payments" />
        <div className="content-body">
          <ManagePayments />
        </div>
      </main>
    </div>
  );
}
