import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/sonner';

// Screens
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Search from './screens/Search';
import BoatDetails from './screens/BoatDetails';
import Booking from './screens/Booking';
import Profile from './screens/Profile';
import Favorites from './screens/Favorites';
import Messages from './screens/Messages';

// Components
import BottomNavigation from './components/BottomNavigation';

// Hooks
import { useNavigation } from './hooks/useNavigation';

// Types
import type { ScreenType } from './types';

import './App.css';

// Screen components map
const screenComponents: Record<ScreenType, React.ComponentType<any>> = {
  onboarding: Onboarding,
  home: Home,
  search: Search,
  'boat-details': BoatDetails,
  booking: Booking,
  profile: Profile,
  favorites: Favorites,
  messages: Messages,
};

// Screens that show bottom navigation
const mainScreens: ScreenType[] = ['home', 'search', 'favorites', 'messages', 'profile'];

function App() {
  const { currentScreen, navigate, goBack, resetToHome, getParam } = useNavigation();

  // Check if user has completed onboarding (in real app, check localStorage)
  useEffect(() => {
    const completed = localStorage.getItem('onboardingCompleted');
    if (completed === 'true') {
      resetToHome();
    }
  }, [resetToHome]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    resetToHome();
  };

  const handleNavigate = (screen: string, params?: any) => {
    navigate(screen as ScreenType, params);
  };

  const handleBack = () => {
    goBack();
  };

  // Get current screen component
  const CurrentScreen = screenComponents[currentScreen];

  // Determine if we should show bottom nav
  const showBottomNav = mainScreens.includes(currentScreen);

  // Get screen-specific props
  const getScreenProps = () => {
    const baseProps = {
      onNavigate: handleNavigate,
      onBack: handleBack,
    };

    switch (currentScreen) {
      case 'onboarding':
        return { onComplete: handleOnboardingComplete };
      case 'boat-details':
        return { ...baseProps, boatId: getParam<string>('boatId') };
      case 'booking':
        return { ...baseProps, boatId: getParam<string>('boatId') };
      default:
        return baseProps;
    }
  };

  return (
    <div className="h-screen w-full bg-gray-100 flex items-center justify-center">
      {/* Mobile Frame (for desktop viewing) */}
      <div className="relative w-full h-full max-w-md mx-auto bg-white shadow-2xl overflow-hidden sm:rounded-[40px] sm:h-[90vh] sm:border-8 sm:border-gray-900">
        {/* Status Bar (decorative) */}
        <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/20 to-transparent z-50 pointer-events-none safe-top">
          <div className="flex items-center justify-between px-6 py-2">
            <span className="text-xs font-semibold text-white/80">9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full border border-white/60" />
              <div className="w-4 h-4 rounded-full border border-white/60" />
              <div className="w-6 h-3 rounded-sm border border-white/60" />
            </div>
          </div>
        </div>

        {/* Screen Content */}
        <div className={`h-full ${showBottomNav ? 'pb-20' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <CurrentScreen {...getScreenProps()} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        {showBottomNav && (
          <BottomNavigation
            currentScreen={currentScreen}
            onNavigate={handleNavigate}
          />
        )}

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-900/20 rounded-full z-50 pointer-events-none safe-bottom" />
      </div>

      <Toaster />
    </div>
  );
}

export default App;
