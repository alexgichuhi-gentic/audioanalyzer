'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headphones, LayoutDashboard, Settings, LogOut, User } from 'lucide-react';
import { useState } from 'react';

export default function Navbar({ user }: { user: { name?: string | null; email?: string | null } | null }) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const links = [
    { href: '/', label: 'Home', icon: Headphones },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/profiles', label: 'Profiles', icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Headphones className="h-7 w-7 text-indigo-600" />
              <span className="text-lg font-bold text-gray-900">AudioAnalyzer</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
          {user ? (
            <div className="relative flex items-center">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    {user.email}
                  </div>
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      onClick={() => {
                        fetch('/api/auth/signout', { method: 'POST' }).then(() => {
                          window.location.href = '/login';
                        });
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
