import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { supabase } from '../../services/supabase';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
    }
    setChecking(false);
  }

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientMid]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Colors.neonCyan} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.neonCyan,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(15, 18, 45, 0.95)',
          borderTopColor: Colors.borderGlass,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: Colors.bgPrimary,
          borderBottomColor: Colors.borderGlass,
          borderBottomWidth: 1,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color }) => <TabBarIcon name="line-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color }) => <TabBarIcon name="globe" color={color} />,
        }}
      />
      <Tabs.Screen
        name="trade"
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <TabBarIcon name="history" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user-circle" color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
