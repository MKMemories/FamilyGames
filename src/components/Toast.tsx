import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: ToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!message) return;
    setShow(true);
    const t = setTimeout(() => {
      setShow(false);
      setTimeout(onDone, 300);
    }, 2000);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  return (
    <div className="toast-container">
      <div className={`toast ${show ? "show" : ""}`}>{message}</div>
    </div>
  );
}
