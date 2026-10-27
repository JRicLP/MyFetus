import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCESSIBLE_COLORS } from '../../theme/accessibility';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const baseTabBarHeight = 65;

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          height: baseTabBarHeight + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 5,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={['#ffffff', '#fafafa']}
            style={{ flex: 1 }}
          />
        ),
        tabBarActiveTintColor: ACCESSIBLE_COLORS.primary,
        tabBarInactiveTintColor: ACCESSIBLE_COLORS.secondary,
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: -5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarAccessibilityLabel: 'Início, página principal',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="water-tracking"
        options={{
          title: 'Água',
          tabBarAccessibilityLabel: 'Água, controle de hidratação',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="tint" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checklist"
        options={{
          title: 'Checklist',
          tabBarAccessibilityLabel: 'Checklist da gestação',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="list" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="exames"
        options={{
          title: 'Exames',
          tabBarAccessibilityLabel: 'Exames e solicitações médicas',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="file-text" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarAccessibilityLabel: 'Chat com assistente médico',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="comments" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
