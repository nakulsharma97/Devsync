import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rss } from "lucide-react";

export default function Feed() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feed</h1>
        <p className="text-sm text-muted-foreground mt-1">Recent activity from your projects</p>
      </div>
      <Card className="border-border/40">
        <CardContent className="py-12 text-center">
          <Rss className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Activity feed coming soon</p>
        </CardContent>
      </Card>
    </div>
  );
}
