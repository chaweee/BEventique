import React, { useEffect, useState } from "react";
import "./InputField.css";

export default function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder = "",
  required = false,
  maxLength,
}) {
  const id = name || label.replace(/\s+/g, "-").toLowerCase();
  const [focused, setFocused] = useState(false);
  const [hasValue, setHasValue] = useState(Boolean(value && value.toString().length > 0));

  useEffect(() => {
    setHasValue(Boolean(value && value.toString().length > 0));
  }, [value]);

  const isFloating = focused || hasValue;

  return (
    <div className={`input-wrap ${isFloating ? "floating" : ""}`}>
      <input
        id={id}
        name={name}
        type={type}
        className="input-control"
        value={value}
        onChange={onChange}
        placeholder=" "
        required={required}
        maxLength={maxLength}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <label htmlFor={id} className="input-label">
        {label}
      </label>
    </div>
  );
}
