import { motion } from 'framer-motion';
import { ChevronLeft, Bell, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface MobileHeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  showNotification?: boolean;
  showProfile?: boolean;
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export default function MobileHeader({
  title,
  showBack = false,
  onBack,
  showNotification = false,
  showProfile = false,
  rightAction,
  transparent = false,
}: MobileHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`sticky top-0 z-40 safe-top ${
        transparent ? 'bg-transparent' : 'bg-white'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          {title && (
            <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {showNotification && (
            <button className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors">
              <Bell className="w-5 h-5 text-gray-700" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          )}
          {showProfile && (
            <Avatar className="w-9 h-9 border-2 border-[#00d4ff]">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          )}
          {rightAction}
          {!rightAction && !showNotification && !showProfile && !showBack && (
            <button className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
