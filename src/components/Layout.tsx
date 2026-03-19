import React from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { LogOut, User, ShieldCheck, ClipboardList, Settings as SettingsIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  profile: any;
}

export default function Layout({ children, profile }: LayoutProps) {
  const handleLogout = () => signOut(auth);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-stone-900 leading-tight">FaceID Attendance</h1>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">
              {profile?.role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-2">
            <span className="text-sm font-semibold text-stone-900">{profile?.name}</span>
            <span className="text-xs text-stone-500">{profile?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
