import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "./InputField";
import CoolButton from "./CoolButton";
import "./Signup.css";
import "./InputField.css";
import "./CoolButton.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NEW: success dialog + stored user
  const [showSuccess, setShowSuccess] = useState(false);
  const [loggedUser, setLoggedUser] = useState(null);

  const submitLogin = async (e) => {
    e && e.preventDefault();
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
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        const stripped = text.replace(/<[^>]*>?/gm, "").trim();
        console.error("Login response (non-JSON):", stripped || text);
        throw new Error(stripped || "Server returned an unexpected response");
      }

      console.log("login response:", res.status, data);

      if (!res.ok) {
        // If backend returns a JSON error message, show it
        throw new Error(data.message || `Request failed (${res.status})`);
      }

      if (data.status === "success" && data.user) {
        // Save minimal user info in sessionStorage (used by other components)
        sessionStorage.setItem("user", JSON.stringify(data.user));
        // Set logged user and show success dialog (do not navigate immediately)
        setLoggedUser(data.user);
        setShowSuccess(true);
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  // Handle continue from dialog
  const handleContinue = () => {
    setShowSuccess(false);
    const role = (loggedUser?.role || loggedUser?.Role || "").toString().toLowerCase();
    if (role === "admin") {
<<<<<<< HEAD
      navigate("/admin-dashboard");
=======
      navigate("/admin");
>>>>>>> 751e909a9f46c3c11abda563f196964a8127bc90
    } else if (role === "designer") {
      navigate("/designer-packages");
    } else {
      navigate("/customer-home");
    }
  };

  return (
    <div className="signup-root">
      <div className="signup-split">
        {/* LEFT: image placeholder */}
        <aside className="signup-right" aria-hidden>
          <div className="image-panel" />
        </aside>

        {/* RIGHT: glass form */}
        <section className="signup-left">
          <form className="glass-card" onSubmit={submitLogin} noValidate>
            <h1 className="glass-title">Welcome Back</h1>

            <InputField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <div className="form-error">{error}</div>}

            <div className="actions">
              <CoolButton type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </CoolButton>
            </div>

            <div className="foot-row">
              <div className="signin-link">
                Don't have an account?{" "}
                <button type="button" className="link-btn" onClick={() => navigate("/signup")}>
                  Sign Up
                </button>
              </div>
              <div className="copyright">© 2025 Catering Service</div>
            </div>
          </form>
        </section>
      </div>

      {/* Success dialog */}
      {showSuccess && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="login-success">
          <div className="modal-card">
            <h3 id="login-success">Logged in Successfully</h3>
            <p>Have a good day{loggedUser?.firstname ? `, ${loggedUser.firstname}` : ""}.</p>
            <div className="modal-actions">
              <CoolButton onClick={handleContinue}>Continue</CoolButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
<<<<<<< HEAD

=======
>>>>>>> 751e909a9f46c3c11abda563f196964a8127bc90
