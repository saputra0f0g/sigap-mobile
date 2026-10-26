// app/(masyarakat)/_layout.js
// Bottom tab navigator for Masyarakat (public reporters).
// Tabs: HOME | LAPORAN | PROFILE
// Design: identical to original app/(tabs)/_layout.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomHeader({ route, options, navigation }) {
  const insets = useSafeAreaInsets();
  const title = options.headerTitle !== undefined ? options.headerTitle : options.title;
  const isDetail = route.name === 'detail-riwayat';
  
  return (
    <View style={[styles.layoutHeader, { paddingTop: insets.top + (Platform.OS === 'android' ? 15 : 0) }]}>
      <View style={styles.headerLeft}>
        {isDetail && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        )}
        <Text style={styles.layoutHeaderTitle}>{title || 'SIGAP PUPR'}</Text>
      </View>
    </View>
  );
}

export default function MasyarakatLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#506690',
        tabBarInactiveTintColor: '#A0AEC0',
        tabBarStyle: {
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 70,
          paddingBottom: 10,
        },
        headerShown: true,
        header: (props) => <CustomHeader {...props} />,
      }}
    >
      <Tabs.Screen
        name="beranda"
        options={{
          title: 'HOME',
          headerTitle: 'SIGAP PUPR',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lapor"
        options={{
          title: 'LAPORAN',
          headerTitle: 'Buat Laporan',
          tabBarLabelStyle: { fontWeight: '700' },
          tabBarIcon: ({ focused }) => (
            <View style={styles.reportTabIcon}>
              <MaterialCommunityIcons
                name="plus"
                size={27}
                color={focused ? '#1F3B6D' : '#526781'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'PROFILE',
          headerTitle: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-outline" size={24} color={color} />
          ),
        }}
      />
      {/* Hidden screens — accessible via router.push but not shown in tab bar */}
      <Tabs.Screen name="detail-riwayat" options={{ href: null, headerTitle: 'Detail Laporan' }} />
      <Tabs.Screen name="terkirim" options={{ href: null, headerTitle: 'Laporan Terkirim' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  layoutHeader: {
    backgroundColor: '#1F3B6D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layoutHeaderTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportTabIcon: {
    width: 54,
    height: 54,
    marginTop: -25,
    marginBottom: 2,
    borderRadius: 27,
    backgroundColor: '#F4B942',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#17345F',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
});
