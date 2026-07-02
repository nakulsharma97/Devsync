import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { ArrowLeft, Code2 } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <div className="px-6 py-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="w-6 h-6 rounded bg-foreground flex items-center justify-center">
            <Code2 className="w-3.5 h-3.5 text-background" />
          </div>
          <span className="text-xs font-medium tracking-tight">DevSync</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-sm"
        >
          <span className="text-6xl font-light text-muted-foreground/30">
            404
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button
            onClick={() => navigate("/")}
            className="mt-8 h-10 text-sm px-6"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to home
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
