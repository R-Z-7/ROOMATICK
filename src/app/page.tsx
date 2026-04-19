import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckSquare, Users, Sparkles, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-green-600" />
          <span className="text-xl font-bold">RoomaTick</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:underline">
            Login
          </Link>
          <Link href="/signup">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl space-y-8">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Share the house. <span className="text-green-600">Share the chores.</span>
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            RoomaTick is the ultimate task management app for roommates. Keep your shared space clean, fair, and argument-free.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8 text-lg font-medium">Start for free</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg font-medium">I have an account</Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-24">
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Track Chores</h3>
            <p className="text-zinc-500">Easily create daily, weekly, or one-off tasks and mark them complete with a single tick.</p>
          </div>
          
          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Fairness First</h3>
            <p className="text-zinc-500">See who has been pulling their weight with our contribution stats and history views.</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Event Based Tasks</h3>
            <p className="text-zinc-500">Bin full? Someone spilled milk? Create urgent tasks instantly so they don't get ignored.</p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        &copy; {new Date().getFullYear()} RoomaTick. Open source MVP for roommates.
      </footer>
    </div>
  );
}
