import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { nativeStackScreenOptions } from '../../shared/navigation/stackScreenOptions';
import ClientTabs from './ClientTabs';
import BoatDetailScreen from '../screens/BoatDetailScreen';
import BookingDetailScreen from '../screens/BookingDetailScreen';
import ChatDetailScreen from '../screens/ChatDetailScreen';
import CityBoatsScreen from '../screens/CityBoatsScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import CityMapScreen from '../screens/CityMapScreen';
import LocationSelectScreen from '../screens/LocationSelectScreen';
import ClientAccountScreen from '../screens/ClientAccountScreen';
import ClientAccountInfoScreen from '../screens/ClientAccountInfoScreen';
import ClientSupportScreen from '../screens/ClientSupportScreen';
import OwnerNotificationsScreen from '../../owner/screens/OwnerNotificationsScreen';
import OwnerLegalDocumentScreen from '../../owner/screens/OwnerLegalDocumentScreen';
import LoginScreen from '../../auth/screens/LoginScreen';
import RegisterScreen from '../../auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../../auth/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator();

export default function ClientNavigator() {
    return (
        <Stack.Navigator screenOptions={nativeStackScreenOptions}>
            <Stack.Screen name="MainTabs" component={ClientTabs} />
            <Stack.Screen name="ClientAccount" component={ClientAccountScreen} />
            <Stack.Screen name="ClientAccountInfo" component={ClientAccountInfoScreen} />
            <Stack.Screen name="ClientNotifications" component={OwnerNotificationsScreen} />
            <Stack.Screen name="ClientSupport" component={ClientSupportScreen} />
            <Stack.Screen name="LegalDocument" component={OwnerLegalDocumentScreen} />
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}
