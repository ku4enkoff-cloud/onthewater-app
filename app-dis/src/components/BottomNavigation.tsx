import { motion } from 'framer-motion';
import { Compass, Search, Heart, MessageCircle, User } from 'lucide-react';
import type { ScreenType } from '@/types';

interface BottomNavigationProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
}

const tabs = [
  { id: 'home' as ScreenType, icon: Compass, label: 'Explore' },
  { id: 'search' as ScreenType, icon: Search, label: 'Search' },
  { id: 'favorites' as ScreenType, icon: Heart, label: 'Saved' },
  { id: 'messages' as ScreenType, icon: MessageCircle, label: 'Messages' },
  { id: 'profile' as ScreenType, icon: User, label: 'Profile' },
];

export default function BottomNavigation({ currentScreen, onNavigate }: BottomNavigationProps) {
  const isActive = (screen: ScreenType) => {
    if (screen === 'home' && currentScreen === 'home') return true;
    if (screen === 'search' && currentScreen === 'search') return true;
    if (screen === 'favorites' && currentScreen === 'favorites') return true;
    if (screen === 'messages' && currentScreen === 'messages') return true;
    if (screen === 'profile' && currentScreen === 'profile') return true;
    return false;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
    >
      <div className="bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.id);
            
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="relative flex flex-col items-center justify-center py-2 px-4 min-w-[64px]"
              >
                {active && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#00d4ff]/10 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: active ? 1.1 : 1,
                    color: active ? '#00d4ff' : '#94a3b8',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                </motion.div>
                <motion.span
                  animate={{
                    color: active ? '#00d4ff' : '#94a3b8',
                    fontWeight: active ? 600 : 400,
                  }}
                  className="text-[10px] mt-1"
                >
                  {tab.label}
                </motion.span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
