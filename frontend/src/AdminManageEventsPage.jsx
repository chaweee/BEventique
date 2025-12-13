import React from "react";
import AdminSidebar from "./AdminSidebar";
import AdminContentHeader from "./AdminContentHeader";
import ManageEvent from "./ManageEvent";
import "./AdminDashboard.css";

export default function AdminManageEventsPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <AdminContentHeader title="Manage Schedule" />
        <div className="content-body">
          <ManageEvent />
        </div>
      </main>
    </div>
  );
}
