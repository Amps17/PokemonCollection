import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../App';

export default function CardsScreen({ route, navigation }) {
  const { setId, setName } = route.params;
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: setName });
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/sets/${setId}/cards`);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching cards:', error);
      alert('Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = async (card) => {
    try {
      if (card.owned) {
        await axios.delete(`${API_URL}/collection/${card.card_id}`);
        Alert.alert('Success', 'Card removed from collection');
      } else {
        await axios.post(`${API_URL}/collection`, {
          card_id: card.card_id,
          quantity: 1,
        });
        Alert.alert('Success', 'Card added to collection');
      }
      fetchCards();
    } catch (error) {
      console.error('Error toggling card:', error);
      Alert.alert('Error', 'Failed to update collection');
    }
  };

  const renderCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.cardItem, item.owned && styles.cardOwned]}
      onPress={() => toggleCard(item)}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardNumber}>#{item.card_number}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{item.card_name}</Text>
        <Text style={styles.cardRarity}>{item.rarity}</Text>
        {item.owned && (
          <Text style={styles.ownedBadge}>✓ Owned (x{item.quantity})</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(item) => item.card_id.toString()}
        numColumns={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOwned: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4caf50',
  },
  cardImage: {
    width: 120,
    height: 168,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardInfo: {
    alignItems: 'center',
    width: '100%',
  },
  cardNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  cardName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  cardRarity: {
    fontSize: 12,
    color: '#666',
  },
  ownedBadge: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: 'bold',
    marginTop: 4,
  },
});