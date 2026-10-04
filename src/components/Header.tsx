'use client';

import React from 'react';
import { LucideIcon, Bell, PlusCircle, LogOut } from 'lucide-react';
import { FontSizeLevel } from '../types';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface HeaderProps {
  portalTitle: string;
  portalBadge: string;
  subtitle: string;
  navItems: NavItemConfig[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  userInitials: string;
  userName: string;
  userRoleLabel: string;
  onProfileClick: () => void;
  onLogoutClick?: () => void;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  highContrastMode: boolean;
  fontSizeLevel: FontSizeLevel;
}

export function Header({
  portalTitle,
  portalBadge,
  subtitle,
  onSelectTab,
  userInitials,
  userName,
  userRoleLabel,
  onProfileClick,
  onLogoutClick,
  primaryActionLabel,
  onPrimaryAction,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  highContrastMode,
}: HeaderProps) {
  return (
    <header
      className={`border-b shrink-0 transition-colors ${
        highContrastMode ? 'bg-black border-amber-500' : 'bg-[#121214] border-zinc-800'
      }`}
    >
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand Identity */}
        <div
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectTab('dashboard')}
        >
          <img
            src="/logo/netso-logo.jpg"
            alt="NETSO Prints and Advertising"
            className="w-11 h-11 sm:w-12 sm:h-12 object-contain rounded-xl shrink-0 transition-all border border-[#D4A017]/60 bg-[#0A0A0C] p-0.5 shadow-md group-hover:scale-105"
          />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white leading-none text-base sm:text-xl">
                {portalTitle}
              </span>
              <span className="bg-[#D4A017] text-black font-extrabold text-xs px-2 py-0.5 rounded-md uppercase tracking-wider">
                {portalBadge}
              </span>
            </div>
            <p
              className={`hidden sm:block font-medium mt-1 leading-snug text-xs sm:text-sm ${
                highContrastMode ? 'text-amber-200' : 'text-zinc-300'
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {primaryActionLabel && onPrimaryAction && (
            <button
              type="button"
              onClick={onPrimaryAction}
              className="px-3.5 sm:px-4 py-2 bg-[#D4A017] hover:bg-[#E6B222] text-black font-extrabold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>{primaryActionLabel}</span>
            </button>
          )}

          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              aria-label="Open notifications"
              className="relative p-2.5 rounded-xl bg-[#1C1C1F] border border-zinc-700 hover:border-[#D4A017] text-[#E6B222] cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#D4A017] text-black font-black text-xs flex items-center justify-center border border-black">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <div
            onClick={onProfileClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onProfileClick()}
            className="flex items-center gap-2.5 pl-3 border-l border-zinc-800 cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#D4A017] to-amber-200 text-black font-black flex items-center justify-center text-sm shadow group-hover:ring-2 group-hover:ring-[#D4A017] transition-all shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:block text-left">
              <span className="block font-bold text-white leading-tight text-sm sm:text-base">
                {userName}
              </span>
              <span className="font-semibold flex items-center gap-1 text-[#E6B222] text-xs mt-0.5">
                ● {userRoleLabel}
              </span>
            </div>
          </div>

          {onLogoutClick && (
            <button
              type="button"
              onClick={onLogoutClick}
              className="px-3 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
