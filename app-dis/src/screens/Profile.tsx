import { motion } from 'framer-motion';
import { 
  Settings, 
  CreditCard, 
  Bell, 
  HelpCircle, 
  Shield, 
  FileText, 
  LogOut, 
  ChevronRight,
  Ship,
  Star,
  Heart
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface ProfileProps {
  onNavigate: (screen: string, params?: any) => void;
}

const menuItems = [
  { id: 'bookings', icon: Ship, label: 'My Bookings', badge: '2 upcoming' },
  { id: 'payments', icon: CreditCard, label: 'Payment Methods' },
  { id: 'notifications', icon: Bell, label: 'Notifications', badge: '3' },
  { id: 'settings', icon: Settings, label: 'Settings' },
  { id: 'help', icon: HelpCircle, label: 'Help & Support' },
  { id: 'privacy', icon: Shield, label: 'Privacy Policy' },
  { id: 'terms', icon: FileText, label: 'Terms of Service' },
];

const stats = [
  { label: 'Trips', value: 12, icon: Ship },
  { label: 'Reviews', value: 8, icon: Star },
  { label: 'Saved', value: 24, icon: Heart },
];

export default function Profile({ onNavigate }: ProfileProps) {
  return (
    <div className="h-full overflow-y-auto ios-scroll pb-24 bg-gray-50">
      {/* Header / Cover */}
      <div className="relative h-40 bg-gradient-to-br from-[#00d4ff] to-[#1e3a5f]">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 50 Q25 30 50 50 T100 50 V100 H0 Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 -mt-16 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80" />
              <AvatarFallback className="text-2xl">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">John Doe</h1>
              <p className="text-gray-500">john.doe@example.com</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="bg-[#00d4ff]/10 text-[#00d4ff]">
                  Verified
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around mt-6 pt-6 border-t border-gray-100">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.button
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex flex-col items-center"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Menu Items */}
      <div className="px-4 mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl overflow-hidden shadow-sm"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                onClick={() => item.id === 'bookings' && onNavigate('bookings')}
                className={`w-full flex items-center justify-between p-4 ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.badge && (
                    <Badge className="bg-[#00d4ff] text-white text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Logout */}
      <div className="px-4 mt-4 mb-8">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-red-500 font-medium"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </motion.button>
      </div>

      {/* Version */}
      <div className="text-center pb-8">
        <p className="text-xs text-gray-400">WaveRentals v1.0.0</p>
      </div>
    </div>
  );
}
