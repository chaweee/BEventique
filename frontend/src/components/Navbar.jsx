import React from "react";
import { useNavigate } from "react-router-dom";
import "./styles/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  const goToPackages = () => navigate("/packages");

  return (
    <nav className="navbar">
      <div className="nav-logo">Baby’s Eventique</div>

      <ul className="nav-links">
        <li>Home</li>

        <li
          className="nav-link-interactive"
          role="button"
          tabIndex={0}
          onClick={goToPackages}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToPackages();
            }
          }}
        >
          Packages
        </li>

        <li>My Bookings</li>
        <li>Profile</li>

        <li
          className="nav-logout"
          role="button"
          tabIndex={0}
          onClick={handleLogout}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleLogout();
            }
          }}
        >
          Logout
        </li>
      </ul>
    </nav>
  );
}
    