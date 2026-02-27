import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OwnerTabs from './OwnerTabs';
import AddBoatScreen from '../screens/AddBoatScreen';
import EditBoatScreen from '../screens/EditBoatScreen';
import BoatDetailScreen from '../../client/screens/BoatDetailScreen';
import ChatDetailScreen from '../../client/screens/ChatDetailScreen';
import BoatTypeScreen from '../screens/BoatTypeScreen';
import BoatInfoScreen from '../screens/BoatInfoScreen';
import BoatLocationScreen from '../screens/BoatLocationScreen';
import BoatScheduleScreen from '../screens/BoatScheduleScreen';
import BoatMediaScreen from '../screens/BoatMediaScreen';
import OwnerAccountInfoScreen from '../screens/OwnerAccountInfoScreen';
import OwnerNotificationsScreen from '../screens/OwnerNotificationsScreen';
import OwnerSupportScreen from '../screens/OwnerSupportScreen';

const Stack = createNativeStackNavigator();

export default function OwnerNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={OwnerTabs} />
            <Stack.Screen name="BoatType" component={BoatTypeScreen} />
            <Stack.Screen name="BoatInfo" component={BoatInfoScreen} />
            <Stack.Screen name="BoatLocation" component={BoatLocationScreen} />
            <Stack.Screen name="BoatSchedule" component={BoatScheduleScreen} />
            <Stack.Screen name="BoatMedia" component={BoatMediaScreen} />
            <Stack.Screen name="AddBoat" component={AddBoatScreen} />
            <Stack.Screen name="EditBoat" component={EditBoatScreen} />
            <Stack.Screen name="BoatDetail" component={BoatDetailScreen} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen name="AccountInfo" component={OwnerAccountInfoScreen} />
            <Stack.Screen name="Notifications" component={OwnerNotificationsScreen} />
            <Stack.Screen name="Support" component={OwnerSupportScreen} />
        </Stack.Navigator>
    );
}
