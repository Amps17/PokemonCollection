import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { API_URL } from '../App';

export default function CollectionScreen() {
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollection = async () => {
    try {
      const response = await axios.get(`${API_URL}/collection`);
      setCollection(response.data);
    } catch (error) {
      console.error('Error fetching collection:', error);
      alert('Failed to load collection');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCollection();
  };

  const renderCard = ({ item }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>{item.card_name}</Text>
        <Text style={styles.quantity}>x{item.quantity}</Text>
      </View>
      <Text style={styles.cardDetails}>
        #{item.card_number} • {item.rarity}
      </Text>
      <Text style={styles.setName}>{item.set_name} ({item.set_code})</Text>
      {item.acquired_date && (
        <Text style={styles.date}>Added: {item.acquired_date}</Text>
      )}
      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  if (collection.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No cards in collection yet</Text>
        <Text style={styles.emptySubtext}>Start adding cards from sets!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Total Cards: {collection.reduce((sum, card) => sum + card.quantity, 0)}
        </Text>
        <Text style={styles.summaryText}>
          Unique Cards: {collection.length}
        </Text>
      </View>
      <FlatList
        data={collection}
        renderItem={renderCard}
        keyExtractor={(item) => item.collection_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e63946',
  },
  cardItem: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
    marginLeft: 10,
  },
  cardDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  setName: {
    fontSize: 14,
    color: '#e63946',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  notes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});