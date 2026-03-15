import { Link, useLocation } from "wouter";
import { Compass, Fish, LayoutDashboard, Swords, Trophy, Menu, X, Moon } from "lucide-react";
import { CurrencyBar } from "./CurrencyBar";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quests", label: "Quests", icon: Swords },
  { href: "/creatures", label: "Creatures", icon: Fish },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/deen", label: "Deen", icon: Moon },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/5 blur-[150px]" />
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl relative z-20">
        <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay" 
             style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/sidebar-texture.png)`, backgroundSize: 'cover' }}>
        </div>
        
        <div className="p-8 relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(14,116,144,0.5)]">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-primary-foreground text-glow">
            AquaQuest
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 relative z-10">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                    isActive 
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(14,116,144,0.1)]" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110")} />
                  <span className="font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_rgba(14,116,144,0.8)]" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 relative z-10">
          <div className="glass-panel p-4 rounded-2xl bg-gradient-to-b from-card/50 to-sidebar text-center border-primary/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2">Depth Level</p>
            <p className="text-3xl font-display font-bold text-primary text-glow">Deep Sea</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background/80 backdrop-blur-md z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display font-bold">AquaQuest</h1>
        </div>
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 md:hidden"
            >
              <div className="p-4 flex justify-end">
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-foreground">
                  <X className="w-8 h-8" />
                </button>
              </div>
              <nav className="flex flex-col items-center justify-center gap-8 mt-10">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="block">
                    <div className={cn("text-2xl font-display font-bold transition-colors", location === item.href ? "text-primary text-glow" : "text-muted-foreground")}>
                      {item.label}
                    </div>
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 relative z-10 pt-16 md:pt-0 h-screen overflow-y-auto overflow-x-hidden">
        <CurrencyBar />
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="p-6 md:p-10 max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
