import React from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import CustomerQueries from "./CustomerQueries";
import "./AdminDashboard.css";

export default function AdminCustomerQueriesPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <AdminContentHeader title="Customer Queries" />
        <div className="content-body">
          <CustomerQueries />
        </div>
      </main>
    </div>
  );
}
