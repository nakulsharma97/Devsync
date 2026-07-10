import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-indigo-500">404</h1>
        <p className="text-muted-foreground mt-4 mb-6">Page not found</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    </div>
  );
}
