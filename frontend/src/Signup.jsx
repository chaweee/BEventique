import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "./InputField";
import CoolButton from "./CoolButton";
import logo from "./components/assets/logo.png";
import "./Signup.css";
import "./InputField.css";
import "./CoolButton.css";

export default function SignUp() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!email.trim()) return "Email is required";
    if (password !== confirmPassword) return "Passwords do not match";
    const digits = phone.replace(/\D/g, "");
    if (digits && digits.length !== 11) return "Phone number must be 11 digits";
    return "";
  };

  const submitSignup = async (e) => {
    e && e.preventDefault();
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3001/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Full_Name: `${firstName}${middleInitial ? ` ${middleInitial}` : ''} ${lastName}`.trim(),
          email,
          password,
          phone: phone.replace(/\D/g, ""),
        }),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Server returned unexpected response");
      }

      if (res.ok && data.status === "success") {
        // show success dialog
        setShowSuccess(true);
      } else {
        setError(data.message || "Signup failed");
      }
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-root">
      <div className="signup-split">
        {/* LEFT: frosted glass sign-up form */}
        <section className="signup-left">
          <form className="glass-card" onSubmit={submitSignup} noValidate>
            <h1 className="glass-title">Create Your Account</h1>

            <div className="cols">
              <InputField
                label="First Name"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <InputField
                label="M.I."
                name="middleInitial"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value)}
                maxLength={1}
              />
              <InputField
                label="Last Name"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <InputField
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <InputField
              label="Phone Number"
              name="phone"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                setPhone(
                  digits.replace(/(\d{4})(\d{0,3})(\d{0,4})/, (m, a, b, c) => {
                    if (!b) return a;
                    if (!c) return `${a} ${b}`;
                    return `${a} ${b} ${c}`;
                  })
                );
              }}
            />

            <div className="two-cols">
              <InputField
                label="Password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <InputField
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="actions">
              <CoolButton type="submit" disabled={loading}>
                {loading ? "Creating..." : "Sign Up"}
              </CoolButton>
            </div>

            <div className="foot-row">
              <div className="signin-link">
                Already have an account?{" "}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => navigate("/login")}
                >
                  Log In
                </button>
              </div>
              <div className="copyright">© 2025 Catering Service</div>
            </div>
          </form>
        </section>

        {/* RIGHT: image placeholder */}
        <aside className="signup-right" aria-hidden>
          <div className="image-panel" style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <img src={logo} alt="Eventique Logo" style={{width: '200px', height: 'auto', opacity: 0.9}} />
          </div>
        </aside>
      </div>

      {/* success dialog */}
      {showSuccess && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-success"
        >
          <div className="modal-card">
            <h3 id="signup-success">Account Created</h3>
            <p>Your account has been created successfully.</p>
            <div className="modal-actions">
              <CoolButton
                onClick={() => {
                  setShowSuccess(false);
                  navigate("/login");
                }}
              >
                Continue
              </CoolButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
