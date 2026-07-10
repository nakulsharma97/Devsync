import { useRef, useState, useEffect } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({ children, className = "", delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "-40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "animate-fade-in-up" : "opacity-0"}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function ScrollRevealFromLeft({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animationStyle = visible ? {
    animation: "fade-in-up 0.6s ease-out both",
  } : { opacity: 0 };

  return (
    <div ref={ref} className={className} style={animationStyle}>
      {children}
    </div>
  );
}

export function ScrollRevealFromRight({ children, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const animationStyle = visible ? {
    animation: "fade-in-up 0.6s ease-out both",
    animationDelay: "0.1s",
  } : { opacity: 0 };

  return (
    <div ref={ref} className={className} style={animationStyle}>
      {children}
    </div>
  );
}
