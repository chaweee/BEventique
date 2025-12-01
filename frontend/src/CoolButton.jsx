import React from "react";
import "./CoolButton.css";

export default function CoolButton({ children, onClick, type = "button", disabled }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cool-btn${disabled ? " disabled" : ""}`}
    >
      <span className="btn-text">{children}</span>
    </button>
  );
}
