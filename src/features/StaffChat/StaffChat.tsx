import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { FontSizeLevel } from '../../types';

interface StaffChatMessage {
  sender: string;
  text: string;
  time: string;
  isStaff: boolean;
}

interface StaffChatProps {
  messages: StaffChatMessage[];
  onSendMessage: (text: string) => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function StaffChat({
  messages,
  onSendMessage,
  highContrastMode,
  fontSizeLevel,
}: StaffChatProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="border-b border-[#D4A017] pb-3">
        <h1
          className={`font-black ${
            highContrastMode ? 'text-white' : 'text-zinc-950'
          } ${
            fontSizeLevel === 'xlarge'
              ? 'text-2xl sm:text-3xl'
              : fontSizeLevel === 'reduced'
              ? 'text-lg sm:text-xl'
              : 'text-xl sm:text-2xl'
          }`}
        >
          NETSO Staff Direct Chat
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-0.5">
          Direct line with our print operator and graphic artists for bleed margin check and file approvals.
        </p>
      </div>

      <div
        className={`border rounded-2xl p-3.5 sm:p-5 h-[460px] flex flex-col justify-between shadow-xs ${
          highContrastMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
        }`}
      >
        <div className="space-y-3 overflow-y-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col max-w-[85%] ${
                m.isStaff ? 'mr-auto items-start' : 'ml-auto items-end'
              }`}
            >
              <span className="text-[10px] text-zinc-500 font-semibold mb-0.5">
                {m.sender} · {m.time}
              </span>
              <div
                className={`p-2.5 sm:p-3 rounded-xl leading-relaxed text-xs sm:text-sm ${
                  m.isStaff
                    ? 'bg-zinc-950 text-white border border-zinc-800'
                    : 'bg-[#D4A017] text-black font-bold border border-[#B8860B]'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-zinc-200 flex gap-2">
          <input
            type="text"
            placeholder="Type message regarding your order or file..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 border border-zinc-300 rounded-xl px-3.5 py-2 font-semibold text-xs sm:text-sm text-zinc-950 bg-zinc-100"
          />
          <button
            type="button"
            onClick={handleSend}
            className="px-4 py-2 bg-[#D4A017] hover:bg-[#B8860B] text-black font-extrabold uppercase rounded-xl border border-black flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffChat;
