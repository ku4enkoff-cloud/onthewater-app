import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ClientTabs from './ClientTabs';
import BoatDetailScreen from '../apps/client/screens/BoatDetailScreen';
import BookingDetailScreen from '../apps/client/screens/BookingDetailScreen';
import ChatDetailScreen from '../apps/client/screens/ChatDetailScreen';

const Stack = createNativeStackNavigator();

export default function ClientNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={ClientTabs} />
            <Stack.Screen name="BoatDetail" component={BoatDetailScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        </Stack.Navigator>
    );
}
