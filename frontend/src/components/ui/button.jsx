import * as React from "react";
import "./button.css";

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

export { Button };
