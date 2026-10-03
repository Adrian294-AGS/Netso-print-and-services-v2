'use client';

import React from 'react';
import { LucideIcon, Wallet, LogOut } from 'lucide-react';
import { FontSizeLevel } from '../types';

export interface SidebarItemConfig {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  badge?: number;
}

interface SidebarProps {
  menuHeading: string;
  items: SidebarItemConfig[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  calloutBadge: string;
  calloutTitle: string;
  calloutDesc: string;
  calloutButtonLabel: string;
  onCalloutAction: () => void;
  userInitials: string;
  userName: string;
  userSubtitle: string;
  onProfileClick: () => void;
  onLogoutClick: () => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Sidebar({
  menuHeading,
  items,
  activeTab,
  onSelectTab,
  calloutBadge,
  calloutTitle,
  calloutDesc,
  calloutButtonLabel,
  onCalloutAction,
  userInitials,
  userName,
  userSubtitle,
  onProfileClick,
  onLogoutClick,
  highContrastMode,
}: SidebarProps) {
  return (
    <aside
      className={`hidden md:block md:col-span-4 lg:col-span-3 p-3.5 space-y-2 overflow-y-auto border-r ${
        highContrastMode ? 'bg-black border-amber-500' : 'bg-[#121214] border-zinc-800'
      }`}
      aria-label="Sidebar Menu"
    >
      {/* NETSO Brand Identity Banner */}
      <div
        onClick={() => onSelectTab('dashboard')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectTab('dashboard')}
        className={`flex items-center gap-3 p-2.5 mb-2 rounded-xl border cursor-pointer transition-all ${
          highContrastMode
            ? 'bg-zinc-950 border-amber-400'
            : 'bg-[#18181C] border-zinc-800 hover:border-[#D4A017]/60'
        }`}
      >
        <img
          src="/logo/netso-logo.jpg"
          alt="NETSO Prints & Ads Logo"
          className="w-11 h-11 rounded-xl object-contain shrink-0 border border-[#D4A017]/50 bg-[#0A0A0C] p-0.5 shadow-sm"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-white text-sm sm:text-base tracking-tight truncate">
              NETSO PRINTS
            </span>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#D4A017]/20 text-[#E6B222] border border-[#D4A017]/40">
              2018
            </span>
          </div>
          <span className="block text-xs text-zinc-400 font-medium truncate">
            Prints, Ads &amp; Photo Services
          </span>
        </div>
      </div>

      <div
        className={`font-extrabold uppercase tracking-wider px-2.5 pt-1 pb-1 text-xs ${
          highContrastMode ? 'text-amber-300' : 'text-zinc-400'
        }`}
      >
        {menuHeading}
      </div>

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all min-h-[48px] cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-[#D4A017] to-[#B8860B] text-black font-extrabold shadow-xs'
                : highContrastMode
                ? 'text-white hover:bg-zinc-900 border border-zinc-700 hover:border-amber-400'
                : 'text-zinc-200 hover:bg-[#1E1E22] hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isActive
                    ? 'bg-black/20 text-black'
                    : highContrastMode
                    ? 'bg-zinc-800 text-yellow-300'
                    : 'bg-zinc-800/90 text-[#E6B222]'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold leading-snug truncate text-sm sm:text-base">
                  {item.label}
                </div>
                <div
                  className={`leading-snug truncate font-medium text-xs mt-0.5 ${
                    isActive
                      ? 'text-black/85 font-semibold'
                      : highContrastMode
                      ? 'text-zinc-300'
                      : 'text-zinc-400'
                  }`}
                >
                  {item.desc}
                </div>
              </div>
            </div>
            {item.badge ? (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${
                  isActive ? 'bg-black text-[#D4A017]' : 'bg-red-600 text-white'
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}

      {/* GCash Action Card */}
      <div className="pt-3 mt-2 border-t border-zinc-800">
        <div
          className={`p-3.5 rounded-xl border space-y-2 relative overflow-hidden ${
            highContrastMode
              ? 'bg-zinc-950 border-blue-400 text-white'
              : 'bg-gradient-to-br from-blue-950/80 via-[#0A1A33] to-[#050C1A] border-blue-600/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-extrabold uppercase text-blue-300 tracking-wider flex items-center gap-1.5 text-xs">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <span>{calloutBadge}</span>
            </span>
          </div>

          <div>
            <h4 className="font-extrabold text-white text-sm sm:text-base">{calloutTitle}</h4>
            <p className="font-medium mt-1 leading-relaxed text-blue-100 text-xs sm:text-sm">
              {calloutDesc}
            </p>
          </div>

          <button
            type="button"
            onClick={onCalloutAction}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs sm:text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 min-h-[38px] cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>{calloutButtonLabel}</span>
          </button>
        </div>
      </div>

      {/* Footer Profile & Log Out */}
      <div className="pt-3 mt-2 border-t border-zinc-800 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-2.5 text-left group min-w-0 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-[#D4A017] text-black font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
            {userInitials}
          </div>
          <div className="truncate">
            <span className="block font-bold text-sm text-zinc-100 group-hover:text-amber-400 truncate">
              {userName}
            </span>
            <span className="block text-xs text-zinc-400">{userSubtitle}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={onLogoutClick}
          className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
