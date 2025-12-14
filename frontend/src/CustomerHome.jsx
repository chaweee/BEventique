import React from "react";
import { useNavigate } from "react-router-dom";
import "./CustomerHome.css";

export default function CustomerHome() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("flash");
    navigate("/login");
  };

  return (
    <div className="ch-root">
      <header className="ch-navbar">
        <div className="ch-navbar-container">
          <div className="ch-navbar-brand">
            <h1 className="ch-brand-title">Baby's Eventique</h1>
          </div>

          <nav className="ch-nav">
            <button className="ch-link" onClick={() => navigate("/customer-home")}>HOME</button>
            <button className="ch-link" onClick={() => navigate("/customer-packages")}>PACKAGES</button>
            <button className="ch-link" onClick={() => navigate("/bookings")}>MANAGE BOOKINGS</button>
            <button className="ch-link" onClick={() => navigate("/design-queries")}>CUSTOMER INQUIRIES</button>
            <div
              className="ch-link ch-logout"
              role="button"
              tabIndex={0}
              onClick={handleLogout}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleLogout(); }}
            >
              LOGOUT
            </div>
          </nav>
        </div>
      </header>

      <main className="ch-main">
        <section className="ch-hero">
          <div className="ch-hero-card">
            <h1>Welcome back</h1>
            <p>Browse themes, preview layouts, and start booking your dream event.</p>
            <div className="ch-hero-actions">
              <button className="ch-cta" onClick={() => navigate("/customer-packages")}>Browse Packages</button>
              <button className="ch-cta ghost" onClick={() => navigate("/bookings")}>My Bookings</button>
            </div>
          </div>
        </section>

        <section className="ch-explore">
          <h2>Recommended layouts</h2>
          <div className="ch-grid">
            <article className="ch-card">
              <div className="ch-thumb" />
              <h3>Princess Birthday Theme</h3>
              <p>Blush roses, tulle drapes, fairy lights — dreamy setup.</p>
              <div className="ch-card-actions">
                <button onClick={() => navigate("/customer-packages")} className="ch-btn">View Packages</button>
                <button onClick={() => navigate("/bookings")} className="ch-btn ghost">Book</button>
              </div>
            </article>

            <article className="ch-card">
              <div className="ch-thumb" />
              <h3>Rustic Garden Wedding</h3>
              <p>Natural timber accents and wildflowers for an intimate day.</p>
              <div className="ch-card-actions">
                <button onClick={() => navigate("/customer-packages")} className="ch-btn">View Packages</button>
                <button onClick={() => navigate("/bookings")} className="ch-btn ghost">Book</button>
              </div>
            </article>

            <article className="ch-card">
              <div className="ch-thumb" />
              <h3>Elegant Tea Party</h3>
              <p>Ivory and rose palette with delicate china and florals.</p>
              <div className="ch-card-actions">
                <button onClick={() => navigate("/customer-packages")} className="ch-btn">View Packages</button>
                <button onClick={() => navigate("/bookings")} className="ch-btn ghost">Book</button>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer className="ch-footer">
        <div>Contact: events@babys-eventique.ph • +63 917 123 4567</div>
        <div>© 2025 Baby's Eventique</div>
      </footer>
    </div>
  );
}
