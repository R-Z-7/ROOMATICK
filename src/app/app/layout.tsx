"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { HouseProvider } from "@/contexts/HouseContext";
import Link from "next/link";
import { CheckSquare, Home, Calendar, History, Users, Settings, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, signOut, userData } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) return null;

  const navigation = [
    { name: "Dashboard", href: "/app/dashboard", icon: Home },
    { name: "Tasks", href: "/app/tasks", icon: CheckSquare },
    { name: "Calendar", href: "/app/calendar", icon: Calendar },
    { name: "History", href: "/app/history", icon: History },
    { name: "Roommates", href: "/app/roommates", icon: Users },
    { name: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
    <HouseProvider>
      <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Sidebar for desktop */}
        <div className="hidden md:flex w-64 flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
          <div className="p-6 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-green-600" />
            <span className="text-xl font-bold">RoomaTick</span>
          </div>
          <nav className="flex-1 space-y-1 px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive 
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium" 
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? "text-green-600 dark:text-green-400" : ""}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-green-100 text-green-700">
                  {userData?.displayName?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userData?.displayName || "User"}</span>
                <span className="text-xs text-zinc-500 truncate w-24">{userData?.email}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-6 w-6 text-green-600" />
              <span className="text-lg font-bold">RoomaTick</span>
            </div>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </header>
          
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </main>
          
          {/* Mobile Bottom Nav */}
          <nav className="md:hidden flex items-center justify-around p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
            {navigation.slice(0, 4).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href} className="flex flex-col items-center gap-1">
                  <item.icon className={`h-5 w-5 ${isActive ? "text-green-600 dark:text-green-400" : "text-zinc-500"}`} />
                  <span className={`text-[10px] ${isActive ? "text-green-600 dark:text-green-400 font-medium" : "text-zinc-500"}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </HouseProvider>
  );
}
