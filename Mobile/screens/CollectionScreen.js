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
import { useTheme } from '../ThemeContext';

export default function CollectionScreen() {
  const { theme } = useTheme();
  const [collection, setCollection] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCollection();
  }, []);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchCollection();
  };

  const renderCard = ({ item }) => (
    <View style={[styles.cardItem, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={2}>
          {item.card_name}
        </Text>
        <Text style={[styles.quantity, { color: theme.success }]}>x{item.quantity}</Text>
      </View>
      <Text style={[styles.cardDetails, { color: theme.textSecondary }]}>
        #{item.card_number} • {item.rarity}
      </Text>
      <Text style={[styles.setName, { color: theme.primary }]}>
        {item.set_name} ({item.set_code})
      </Text>
      {item.acquired_date && (
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          Added: {item.acquired_date}
        </Text>
      )}
      {item.notes && (
        <Text style={[styles.notes, { color: theme.textSecondary }]}>{item.notes}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading collection...</Text>
      </View>
    );
  }

  if (collection.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No cards in collection yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          Start adding cards from sets!
        </Text>
      </View>
    );
  }

  const totalCards = collection.reduce((sum, card) => sum + card.quantity, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.summary, { backgroundColor: theme.backgroundAlt, borderBottomColor: theme.border }]}>
        <Text style={[styles.summaryText, { color: theme.primary }]}>
          Total Cards: {totalCards}
        </Text>
        <Text style={[styles.summaryText, { color: theme.primary }]}>
          Unique Cards: {collection.length}
        </Text>
      </View>
      <FlatList
        data={collection}
        renderItem={renderCard}
        keyExtractor={(item) => item.card_id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderBottomWidth: 1,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  cardItem: {
    marginBottom: 10,
    padding: 15,
    borderRadius: 12,
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
    marginLeft: 10,
  },
  cardDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  setName: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    marginTop: 4,
  },
  notes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});