import React, { useCallback } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Linking } from 'react-native';
import { getOwnerAppExternalUrl } from '../../shared/infrastructure/config';
import { theme } from '../../shared/theme';

const ownerAppIcon = require('../../../assets/icon-owner.png');

/**
 * Промо-блок «приложение для владельцев» (как на Boatsetter).
 * Показывается всем: гостям и авторизованным клиентам.
 */
export default function OwnerAppPromoBanner({ tabletCardStyle }) {
    const openOwnerApp = useCallback(() => {
        const url = getOwnerAppExternalUrl();
        Linking.openURL(url).catch(() => {});
    }, []);

    return (
        <Pressable
            onPress={openOwnerApp}
            style={({ pressed }) => [
                styles.wrap,
                tabletCardStyle,
                pressed && styles.wrapPressed,
            ]}
            accessibilityRole="link"
            accessibilityLabel="Приложение для владельцев катеров, узнать больше"
        >
            <Image source={ownerAppIcon} style={styles.icon} resizeMode="cover" />
            <View style={styles.textCol}>
                <Text style={styles.title}>Владеете катером?</Text>
                <Text style={styles.desc}>
                    Зарабатывайте, сдавая судно в аренду в приложении для владельцев. Узнать больше
                </Text>
            </View>
        </Pressable>
    );
}

const ICON_SIZE = 72;

const styles = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: theme.spacing.md,
        marginTop: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: '#fff',
        borderRadius: 20,
        gap: theme.spacing.md,
        borderWidth: 1,
        borderColor: '#E8EDF3',
        ...theme.shadows.card,
    },
    wrapPressed: {
        opacity: 0.92,
    },
    icon: {
        width: ICON_SIZE,
        height: ICON_SIZE,
        borderRadius: 18,
    },
    textCol: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontSize: 17,
        fontFamily: theme.fonts.bold,
        color: theme.colors.primary,
        marginBottom: 6,
    },
    desc: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: theme.fonts.regular,
        color: theme.colors.gray700,
    },
});
