import React from 'react';
import { Modal, Platform } from 'react-native';

const isIOSPad = Platform.OS === 'ios' && Platform.isPad;

/**
 * Обёртка над Modal: не монтирует нативный слой, пока visible=false.
 * На iPad прозрачные Modal с visible=false часто перехватывают все касания.
 */
export default function AppModal({ visible, children, presentationStyle, ...rest }) {
    if (!visible) return null;
    return (
        <Modal
            visible
            presentationStyle={presentationStyle ?? (isIOSPad ? 'overFullScreen' : undefined)}
            {...rest}
        >
            {children}
        </Modal>
    );
}
