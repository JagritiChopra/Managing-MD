import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Dimensions, Platform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// A responsive tab bar height based on screen height
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.09 : SCREEN_HEIGHT * 0.08;
const TAB_BAR_PADDING = Platform.OS === 'ios' ? SCREEN_HEIGHT * 0.015 : SCREEN_HEIGHT * 0.062;


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;
          if (route.name === 'index') iconName = 'home';
          else if (route.name === 'journal') iconName = 'book';
          else if (route.name === 'comfort') iconName = 'heart';
          else if (route.name === 'timer') iconName = 'timer';
          else if (route.name === 'profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
           tabBarActiveTintColor: '#3B82F6' ,
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: {
          backgroundColor: '#1F2937', // your desired color
          borderTopWidth: 0,           // optional: remove top border
          height: TAB_BAR_HEIGHT,
          paddingVertical: TAB_BAR_PADDING,
          
        },
        tabBarItemStyle: {
          paddingTop: 8,   // pushes icon downward
        },

      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="comfort" options={{ title: 'Comfort' }} />
      <Tabs.Screen name="timer" options={{ title: 'Timer' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}