import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClientTabs from './ClientTabs';
import BoatDetailScreen from '../screens/BoatDetailScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import CityBoatsScreen from '../screens/CityBoatsScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import CityMapScreen from '../screens/CityMapScreen';
import LocationSelectScreen from '../screens/LocationSelectScreen';
import LoginScreen from '../../auth/screens/LoginScreen';
import RegisterScreen from '../../auth/screens/RegisterScreen';

const Stack = createNativeStackNavigator();

export default function ClientNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={ClientTabs} />
            <Stack.Screen name="BoatDetail" component={BoatDetailScreen} />
            <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
            <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
            <Stack.Screen name="CityBoats" component={CityBoatsScreen} />
            <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
            <Stack.Screen
                name="CityMap"
                component={CityMapScreen}
                options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="LocationSelect" component={LocationSelectScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}
