import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CardsScreen from './screens/CardsScreen';
import CollectionScreen from './screens/CollectionScreen';
import SetsScreen from './screens/SetsScreen';
import StatsScreen from './screens/StatsScreen';

const Stack = createNativeStackNavigator();

export const API_URL = 'http://192.168.0.244:3000/api';

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Sets"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#e63946',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Sets"
          component={SetsScreen}
          options={{ title: 'Pokemon Sets' }}
        />
        <Stack.Screen
          name="Cards"
          component={CardsScreen}
          options={{ title: 'Cards in Set' }}
        />
        <Stack.Screen
          name="Collection"
          component={CollectionScreen}
          options={{ title: 'My Collection' }}
        />
        <Stack.Screen
          name="Stats"
          component={StatsScreen}
          options={{ title: 'Statistics' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
