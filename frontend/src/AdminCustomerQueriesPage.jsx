import React from "react";
import AdminSidebar from "./AdminSidebar";
import CustomerQueries from "./CustomerQueries";
import "./AdminDashboard.css";

export default function AdminCustomerQueriesPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Customer Queries</h1>
          <div className="user-profile">Administrator</div>
        </header>
        <div className="content-body">
          <CustomerQueries />
        </div>
      </main>
    </div>
  );
}
