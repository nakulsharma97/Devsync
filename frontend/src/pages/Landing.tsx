import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f0f1a", color: "white" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ textAlign: "center" }}
      >
        <h1 style={{ fontSize: "3rem", fontWeight: "bold" }}>DevSync</h1>
        <p style={{ fontSize: "1.2rem", color: "#888", marginTop: "0.5rem" }}>
          Developer Collaboration Platform
        </p>
      </motion.div>
    </div>
  );
}
