import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "./InputField";
import CoolButton from "./CoolButton";
import logo from "./components/assets/logo.png";
import "./Signup.css";
import "./InputField.css";
import "./CoolButton.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);
  const [loggedUser, setLoggedUser] = useState(null);

  const submitLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.status === "success" && data.user) {
        sessionStorage.setItem("user", JSON.stringify(data.user));
        setLoggedUser(data.user);
        setShowSuccess(true);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    setShowSuccess(false);
    const role = (loggedUser?.role || "").toLowerCase();

    if (role === "admin") {
      navigate("/admin-dashboard");
    } else if (role === "designer") {
      navigate("/designer-packages");
    } else {
      navigate("/customer-home");
    }
  };

  return (
    <div className="signup-root">
      <div className="signup-split">

        {/* LEFT: Glass Login Form */}
        <section className="signup-left">
          <form className="glass-card" onSubmit={submitLogin} noValidate>
            <h1 className="glass-title">Welcome Back</h1>

            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="form-error">{error}</div>}

            <CoolButton type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </CoolButton>

            <div className="foot-row">
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate("/signup")}
                >
                  Sign Up
                </button>
              </span>
              <span className="copyright">
                © 2025 Catering Service
              </span>
            </div>
          </form>
        </section>

        {/* RIGHT: Logo Showcase */}
        <aside className="signup-right" aria-hidden>
          <div className="logo-panel">
            <img
              src={logo}
              alt="Eventique Logo"
              className="logo-showcase"
            />
          </div>
        </aside>

      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Logged in Successfully</h3>
            <p>
              Have a good day
              {loggedUser?.firstname ? `, ${loggedUser.firstname}` : ""}.
            </p>
            <CoolButton onClick={handleContinue}>
              Continue
            </CoolButton>
          </div>
        </div>
      )}
    </div>
  );
}
