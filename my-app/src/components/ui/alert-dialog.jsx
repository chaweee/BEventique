import React, { createContext, useContext, useState } from "react";
import "./alert-dialog.css";

const AlertDialogContext = createContext({});

export function AlertDialog({ children, open, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  
  const setOpen = (value) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  return (
    <AlertDialogContext.Provider value={{ isOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild }) {
  const { setOpen } = useContext(AlertDialogContext);
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (e) => {
        children.props.onClick?.(e);
        setOpen(true);
      }
    });
  }
  
  return (
    <button className="alert-dialog-trigger" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function AlertDialogContent({ children, dir }) {
  const { isOpen, setOpen } = useContext(AlertDialogContext);
  
  if (!isOpen) return null;
  
  return (
    <div className="alert-dialog-overlay" onClick={() => setOpen(false)}>
      <div 
        className="alert-dialog-content" 
        dir={dir}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children }) {
  return <div className="alert-dialog-header">{children}</div>;
}

export function AlertDialogTitle({ children }) {
  return <h2 className="alert-dialog-title">{children}</h2>;
}

export function AlertDialogDescription({ children }) {
  return <p className="alert-dialog-description">{children}</p>;
}

export function AlertDialogFooter({ children }) {
  return <div className="alert-dialog-footer">{children}</div>;
}

export function AlertDialogCancel({ children, onClick }) {
  const { setOpen } = useContext(AlertDialogContext);
  
  return (
    <button 
      className="alert-dialog-btn alert-dialog-cancel"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

export function AlertDialogAction({ children, onClick }) {
  const { setOpen } = useContext(AlertDialogContext);
  
  return (
    <button 
      className="alert-dialog-btn alert-dialog-action"
      onClick={() => {
        onClick?.();
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}
