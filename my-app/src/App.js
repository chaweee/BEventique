import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

import Login from "./Login";
import SignUp from "./Signup";
import CustomerHome from "./CustomerHome";
import CustomerPackages from "./CustomerPackages";
import BookingPage from "./BookingPage";
import CustomerDesignQueries from "./CustomerDesignQueries";
import DesignerPackages from "./DesignerPackages";
import DesignerQueries from "./DesignerQueries";
import DesignManagement from "./DesignManagement";
import BookingManagement from "./BookingManagement";
import AdminDashboard from "./AdminDashboard";


function RequireAuth({ children, adminOnly = false }) {
  const raw = sessionStorage.getItem("user");
  if (!raw) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(raw);

    if (adminOnly) {
      const role = (user.role || user.Role || user.roleName || "")
        .toString()
        .toLowerCase();

      if (role !== "admin") {
        return <Navigate to="/customer-home" replace />;
      }
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Simple root redirect: if logged in go to customer home, otherwise to login
function AuthRedirect() {
  const raw = sessionStorage.getItem("user");
  return raw ? <Navigate to="/customer-home" replace /> : <Navigate to="/login" replace />;
}

function App() {

  return (
    <BrowserRouter>
      <Routes>

        {/* Default goes to login or customer home if session exists */}
        <Route path="/" element={<AuthRedirect />} />

        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Customer home (protected) */}
        <Route
          path="/customer-home"
          element={
            <RequireAuth>
              <CustomerHome />
            </RequireAuth>
          }
        />

        {/* Customer Packages (protected) */}
        <Route
          path="/customer-packages"
          element={
            <RequireAuth>
              <CustomerPackages />
            </RequireAuth>
          }
        />

        {/* Admin Dashboard (protected) */}

        <Route 
          path="/admin-dashboard" 
          element={
            <RequireAuth adminOnly={true}>
              <AdminDashboard />
            </RequireAuth>
          } 
        />

        {/* Booking Management (protected) */}
        <Route
          path="/bookings"
          element={
            <RequireAuth>
              <BookingManagement />
            </RequireAuth>
          }
        />

        {/* Designer Packages (protected) */}
        <Route
          path="/designer-packages"
          element={
            <RequireAuth>
              <DesignerPackages />
            </RequireAuth>
          }
        />

        {/* Designer Queries (protected) */}
        <Route
          path="/designer-queries"
          element={
            <RequireAuth>
              <DesignerQueries />
            </RequireAuth>
          }
        />

        {/* Design Management (protected) */}
        <Route
          path="/design-management"
          element={
            <RequireAuth>
              <DesignManagement />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
