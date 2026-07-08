import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: "Faces",
    emojis: [
      "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😙", "😚", "🤗", "🫣", "🤭", "🫢", "🤫", "😐",
      "😑", "😶", "🫥", "😏", "😒", "🙄", "😬", "😮", "😯", "😲", "😳", "🥺",
      "😢", "😭", "😤", "😡", "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹",
      "👺", "👻", "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀",
      "😿", "😾",
    ],
  },
  {
    name: "Gestures",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏",
      "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "🫵", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲",
      "🤝", "🙏", "💪", "🦵", "🦶", "👂", "👃", "🧠", "🫀", "🫁", "👀", "👁️",
      "👅", "👄", "💋",
    ],
  },
  {
    name: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "💟", "❣️", "💔", "❤️‍🔥", "❤️‍🩹", "💌", "🫶",
    ],
  },
  {
    name: "Objects",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⚽", "🏀", "🏈", "⚾",
      "🎾", "🏐", "🏓", "🥏", "🎯", "🎮", "🎲", "♟️", "🎸", "🎹", "🎧", "📱",
      "💻", "⌨️", "🖥️", "🖨️", "📷", "📸", "📹", "🎥", "📡", "🔋", "💡", "🔦",
      "💰", "💎", "📚", "📝", "✏️", "🔑", "🗝️", "🔒", "🔓", "🔔", "⏰", "📌",
    ],
  },
  {
    name: "Nature",
    emojis: [
      "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️",
      "🔥", "💫", "⭐", "🌟", "✨", "💥", "🌈", "☂️", "🌊", "🍀", "🌺", "🌸",
      "🌻", "🌹", "🌷", "🌿", "🍃", "🍂", "🍁", "🍄", "🌵", "🌲", "🌳", "🌴",
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
      "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦋", "🐛", "🐝",
    ],
  },
  {
    name: "Symbols",
    emojis: [
      "✅", "❌", "❓", "❔", "❗", "‼️", "⁉️", "💯", "🔥", "💪", "🚀", "👀",
      "🎯", "💀", "☠️", "⚡", "💤", "💩", "👾", "🤖", "🎃", "💊", "🩸", "🧬",
      "🔬", "🔭", "🧪", "🧫", "🩺", "💉", "🪐", "🌍", "🌎", "🌏", "🧩", "♻️",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-40"
        title="Add emoji"
        type="button"
      >
        <Smile className="w-4 h-4" />
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute bottom-10 left-0 z-50 w-[320px] bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 origin-bottom-left"
        >
          {/* Category tabs */}
          <div className="flex gap-0.5 p-1.5 border-b border-border/50 overflow-x-auto">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(i)}
                className={`shrink-0 px-2 py-1 text-[10px] rounded-md transition-colors ${
                  activeCategory === i
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
                }`}
              >
                {cat.emojis[0]} {cat.name}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="p-2 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-8 gap-0.5">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelect(emoji);
                    setOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-accent/10 rounded-lg transition-colors hover:scale-110"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
