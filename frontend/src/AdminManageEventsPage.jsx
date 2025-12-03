import React from "react";
import AdminSidebar from "./AdminSidebar";
import ManageEvent from "./ManageEvent";
import "./AdminDashboard.css";

export default function AdminManageEventsPage() {
  return (
    <div className="admin-root">
      <AdminSidebar />
      <main className="admin-content">
        <header className="content-header">
          <h1>Manage Schedule</h1>
          <div className="user-profile">Administrator</div>
        </header>
        <div className="content-body">
          <ManageEvent />
        </div>
      </main>
    </div>
  );
}
