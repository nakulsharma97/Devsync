export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-indigo-950/20 to-background" />
      <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/10 via-purple-500/8 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-32 w-[400px] h-[400px] bg-gradient-to-bl from-purple-500/10 via-pink-500/8 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent rounded-full blur-3xl" />
    </div>
  );
}
