import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OwnerTabs from './OwnerTabs';
import AddBoatScreen from '../apps/owner/screens/AddBoatScreen';
import BoatDetailScreen from '../apps/client/screens/BoatDetailScreen';
import ChatDetailScreen from '../apps/client/screens/ChatDetailScreen';

const Stack = createNativeStackNavigator();

export default function OwnerNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={OwnerTabs} />
            <Stack.Screen name="AddBoat" component={AddBoatScreen} />
            <Stack.Screen name="BoatDetail" component={BoatDetailScreen} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        </Stack.Navigator>
    );
}
