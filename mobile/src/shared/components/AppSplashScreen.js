import React from 'react';
import { View, ActivityIndicator, ImageBackground, StyleSheet } from 'react-native';

const splashImage = require('../../../assets/splash-owner.png');

export default function AppSplashScreen() {
  return (
    <ImageBackground source={splashImage} style={styles.container} imageStyle={styles.image}>
      <View style={styles.overlay} />
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 8, 24, 0.18)',
  },
  loader: {
    marginBottom: 48,
    alignSelf: 'center',
  },
});
