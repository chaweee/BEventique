import React from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import AdminCustomerQueries from "./AdminCustomerQueries";
import "./AdminDashboard.css";

export default function AdminCustomerQueriesPage() {
  return (
    <div className="dq-root">
      <AdminSidebar />
      <AdminCustomerQueries />
    </div>
  );
}
