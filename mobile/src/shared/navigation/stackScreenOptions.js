import { Platform } from 'react-native';

const isIOSPad = Platform.OS === 'ios' && Platform.isPad;

/** Общие опции native stack: на iPad отключаем fullScreenGesture — ломает тапы после входа. */
export const nativeStackScreenOptions = {
    headerShown: false,
    gestureEnabled: true,
    fullScreenGestureEnabled: !isIOSPad,
};
