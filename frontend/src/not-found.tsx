// frontend/src/not-found.tsx

import React from "react";
import { Link } from "wouter";

const NotFound: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#0f172a", // slate-900
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>404</h1>
      <p style={{ fontSize: "1.25rem", color: "#94a3b8" }}>
        Oops! Page Not Found.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "2rem",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#4f46e5", // indigo-600
          color: "white",
          borderRadius: "0.5rem",
          textDecoration: "none",
        }}
      >
        Go back to Home
      </Link>
    </div>
  );
};

export default NotFound;