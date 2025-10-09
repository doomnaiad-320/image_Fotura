"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#111111",
          color: "#ffffff",
          border: "1px solid #222222"
        }
      }}
    />
  );
}
