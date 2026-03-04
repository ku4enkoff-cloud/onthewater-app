import React from 'react';
import { View, Text, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { theme } from '../theme';

const logo = require('../../../assets/icon.png');

export default function AppSplashScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title}>BoatRent</Text>
        <Text style={styles.subtitle}>Аренда яхт и катеров</Text>
      </View>
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.waveDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
  },
  loader: {
    position: 'absolute',
    bottom: 48,
  },
});
