import { useState, useCallback } from 'react';
import type { ScreenType } from '@/types';

interface NavigationState {
  currentScreen: ScreenType;
  screenHistory: ScreenType[];
  params?: Record<string, any>;
}

export function useNavigation() {
  const [state, setState] = useState<NavigationState>({
    currentScreen: 'onboarding',
    screenHistory: [],
    params: {},
  });

  const navigate = useCallback((screen: ScreenType, params?: Record<string, any>) => {
    setState((prev) => ({
      currentScreen: screen,
      screenHistory: [...prev.screenHistory, prev.currentScreen],
      params: params || {},
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.screenHistory.length === 0) {
        return prev;
      }
      const newHistory = [...prev.screenHistory];
      const previousScreen = newHistory.pop() || 'home';
      return {
        currentScreen: previousScreen,
        screenHistory: newHistory,
        params: {},
      };
    });
  }, []);

  const resetToHome = useCallback(() => {
    setState({
      currentScreen: 'home',
      screenHistory: [],
      params: {},
    });
  }, []);

  const getParam = useCallback(<T>(key: string, defaultValue?: T): T | undefined => {
    return state.params?.[key] ?? defaultValue;
  }, [state.params]);

  return {
    currentScreen: state.currentScreen,
    navigate,
    goBack,
    resetToHome,
    getParam,
    canGoBack: state.screenHistory.length > 0,
  };
}
