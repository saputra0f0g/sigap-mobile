// app/(pegawai)/_layout.js
// Bottom tab navigator for Petugas PUPR (staff).
// Tabs: Dashboard | Laporan Masuk | Profil

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const colors = {
  primary: '#001e57',
  surface: '#ffffff',
  outlineVariant: '#c5c6d1',
};

function CustomHeader({ route, options, navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const title = options.headerTitle !== undefined ? options.headerTitle : options.title;
  const isDetail = route.name === 'detail-laporan' || route.name === 'update-progres';
  
  return (
    <View style={[styles.layoutHeader, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]}>
      <View style={styles.headerLeft}>
        {isDetail ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <Image 
            source={user?.foto_url
              ? { uri: user.foto_url }
              : require('../../assets/images/LOGO-PUPR2.png')
            }
            style={styles.profilePic} 
          />
        )}
        <Text style={styles.layoutHeaderTitle}>{title || 'SIGAP PUPR'}</Text>
      </View>
      
      <View style={styles.headerRight}>
        {!isDetail ? (
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons name="notifications" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <MaterialIcons name="person" size={24} color={colors.primary} />
        )}
      </View>
    </View>
  );
}

export default function PegawaiLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#755700',
        tabBarInactiveTintColor: '#757681',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#c5c6d1',
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
          title: 'Dashboard',
          headerTitle: 'SIGAP PUPR',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="laporan"
        options={{
          title: 'Tugas',
          headerTitle: 'Daftar Tugas',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="assignment" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil-pegawai"
        options={{
          title: 'Profil',
          headerTitle: 'Profil Petugas',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="detail-laporan" options={{ href: null, headerTitle: 'Detail Tugas' }} />
      <Tabs.Screen name="update-progres" options={{ href: null, headerTitle: 'Update Progres' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  layoutHeader: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layoutHeaderTitle: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    marginRight: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
});
