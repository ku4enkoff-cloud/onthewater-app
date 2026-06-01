import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { theme } from '../../shared/theme';

let LinearGradient = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (_) {}

const GRADIENT = ['#0A4D4D', '#0D5C5C', '#1A7A5A'];
const TEAL = '#0D5C5C';

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
  *{margin:0;padding:0}
  html,body,#map{width:100%;height:100%}
</style>
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=none" type="text/javascript"></script>
</head>
<body>
<div id="map"></div>
<script>
ymaps.ready(function(){
  var map = new ymaps.Map('map',{center:[55.751244,37.618423],zoom:10,controls:['zoomControl']});
  var marker = null;

  function reverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&accept-language=ru';
    fetch(url)
      .then(function(r){ return r.json(); })
      .then(function(data){
        var a = data.address || {};
        var country = a.country || '';
        var state = a.state || '';
        var city = a.city || a.town || a.village || '';
        if(!city && state && state !== country) city = state;
        var road = a.road || '';
        var house = a.house_number || '';
        var address = road;
        if(house) address = address ? address + ', ' + house : house;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:'geocode', country:country, region:state, city:city, address:address
        }));
      })
      .catch(function(err){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:'geocode', country:'', region:'', city:'', address:''
        }));
      });
  }

  map.events.add('click',function(e){
    var coords = e.get('coords');
    if(marker) map.geoObjects.remove(marker);
    marker = new ymaps.Placemark(coords,{},{
      preset:'islands#redDotIcon'
    });
    map.geoObjects.add(marker);

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'coords', lat:coords[0], lng:coords[1]
    }));

    reverseGeocode(coords[0], coords[1]);
  });
});
</script>
</body>
</html>
`;

export default function BoatLocationScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const boatType = route.params?.boatType;
    const boatInfo = route.params?.boatInfo;
    const saved = route.params?.boatLocation;

    const [lat, setLat] = useState(saved?.lat ?? null);
    const [lng, setLng] = useState(saved?.lng ?? null);
    const [country, setCountry] = useState(saved?.country || '');
    const [region, setRegion] = useState(saved?.region || '');
    const [city, setCity] = useState(saved?.city || '');
    const [address, setAddress] = useState(saved?.address || '');
    const [yachtClub, setYachtClub] = useState(saved?.yachtClub || '');
    const [mapError, setMapError] = useState(route.params?.validationErrors?.map || '');
    const [mapReady, setMapReady] = useState(false);

    const webRef = useRef(null);

    const onMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'coords') {
                setLat(data.lat);
                setLng(data.lng);
                setMapError('');
            } else if (data.type === 'geocode') {
                setCountry(data.country || '');
                setRegion(data.region || '');
                setCity(data.city || '');
                setAddress(data.address || '');
            }
        } catch (_) {}
    };

    const handleNext = () => {
        if (lat == null || lng == null) {
            setMapError('Нажмите на карту, чтобы указать место стоянки катера');
            return;
        }
        navigation.navigate('BoatSchedule', {
            boatType,
            boatInfo,
            boatLocation: {
                lat,
                lng,
                country: country.trim(),
                region: region.trim(),
                city: city.trim(),
                address: address.trim(),
                yachtClub: yachtClub.trim(),
            },
        });
    };

    return (
        <View style={s.root}>
            {/* Gradient header */}
            <View style={s.headerWrap}>
                {LinearGradient ? (
                    <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                ) : (
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: TEAL }]} />
                )}

                <View style={[s.headerInner, { paddingTop: insets.top + 8 }]}>
                    <TouchableOpacity
                        style={s.backBtn}
                        onPress={() => navigation.goBack()}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <ChevronLeft size={24} color="#fff" />
                        <Text style={s.backText}>Назад</Text>
                    </TouchableOpacity>

                    <Text style={s.title}>Где находится{'\n'}ваш катер?</Text>
                    <Text style={s.subtitle}>
                        Нажмите на карту, чтобы указать местоположение. Точный адрес будет показан гостям только после подтверждения бронирования.
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={s.body}
                    contentContainerStyle={[s.bodyContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Map */}
                    {mapError ? <Text style={s.fieldErrorText}>{mapError}</Text> : null}
                    <View style={[s.mapContainer, mapError && s.mapContainerError]}>
                        {!mapReady && (
                            <View style={s.mapLoader}>
                                <ActivityIndicator size="large" color={TEAL} />
                                <Text style={s.mapLoaderText}>Загрузка карты...</Text>
                            </View>
                        )}
                        <WebView
                            ref={webRef}
                            source={{ html: MAP_HTML }}
                            style={[s.map, !mapReady && { opacity: 0 }]}
                            onMessage={onMessage}
                            onLoadEnd={() => setMapReady(true)}
                            javaScriptEnabled
                            domStorageEnabled
                            scrollEnabled={false}
                            nestedScrollEnabled={false}
                        />
                        {lat != null && lng != null && (
                            <View style={s.coordsBadge}>
                                <MapPin size={14} color="#fff" />
                                <Text style={s.coordsText}>
                                    {lat.toFixed(5)}, {lng.toFixed(5)}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Auto-filled fields */}
                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Страна</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={country}
                            onChangeText={setCountry}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Область</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={region}
                            onChangeText={setRegion}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Город</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={city}
                            onChangeText={setCity}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Улица, дом</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Определится автоматически"
                            placeholderTextColor="#9CA3AF"
                            value={address}
                            onChangeText={setAddress}
                        />
                    </View>

                    <View style={s.fieldWrap}>
                        <Text style={s.fieldLabel}>Название яхт-клуба</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Необязательно"
                            placeholderTextColor="#9CA3AF"
                            value={yachtClub}
                            onChangeText={setYachtClub}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                    style={s.nextBtn}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <Text style={s.nextBtnText}>Продолжить</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#fff' },

    /* Header */
    headerWrap: { overflow: 'hidden' },
    headerInner: { paddingHorizontal: 20, paddingBottom: 28 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backText: { color: '#fff', fontSize: 16, fontFamily: theme.fonts.medium, marginLeft: 4 },
    title: {
        fontSize: 28, fontFamily: theme.fonts.bold, color: '#fff',
        lineHeight: 36, marginBottom: 10,
    },
    subtitle: {
        fontSize: 14, fontFamily: theme.fonts.regular, color: 'rgba(255,255,255,0.82)',
        lineHeight: 20,
    },

    /* Body */
    body: { flex: 1 },
    bodyContent: { paddingHorizontal: 20, paddingTop: 20 },

    /* Map */
    fieldErrorText: { fontSize: 12, fontFamily: theme.fonts.medium, color: '#DC2626', marginBottom: 8 },
    mapContainerError: { borderWidth: 2, borderColor: '#DC2626' },
    mapContainer: {
        height: 260, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20,
        backgroundColor: '#F3F4F6',
    },
    map: { flex: 1 },
    mapLoader: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F3F4F6', zIndex: 2,
    },
    mapLoaderText: {
        marginTop: 8, fontSize: 13, fontFamily: theme.fonts.regular, color: '#9CA3AF',
    },
    coordsBadge: {
        position: 'absolute', bottom: 10, left: 10,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(13,92,92,0.85)', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 5,
    },
    coordsText: {
        fontSize: 12, fontFamily: theme.fonts.medium, color: '#fff',
    },

    /* Fields */
    fieldWrap: { marginBottom: 16 },
    fieldLabel: {
        fontSize: 14, fontFamily: theme.fonts.medium, color: '#374151',
        marginBottom: 6,
    },
    input: {
        borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 16, fontFamily: theme.fonts.regular, color: '#1B365D',
        backgroundColor: '#fff',
    },

    /* Footer */
    footer: {
        paddingHorizontal: 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#fff',
    },
    nextBtn: {
        backgroundColor: TEAL, borderRadius: 12,
        paddingVertical: 16, alignItems: 'center',
    },
    nextBtnDisabled: { opacity: 0.45 },
    nextBtnText: { fontSize: 16, fontFamily: theme.fonts.semiBold, color: '#fff' },
});
