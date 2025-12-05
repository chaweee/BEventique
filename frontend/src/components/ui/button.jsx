import * as React from "react";
import "./button.css";

// Simple buttonVariants function for calendar component
const buttonVariants = ({ variant = "default", size = "default", className = "" }) => {
  const baseClass = "ui-button";
  const variantClass = `ui-button-${variant}`;
  const sizeClass = `ui-button-${size}`;
  return `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();
};

const Button = React.forwardRef(
  ({ className = "", variant = "default", size = "default", children, ...props }, ref) => {
    return (
      <button
        className={`ui-button ui-button-${variant} ui-button-${size} ${className}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
