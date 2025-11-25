import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../App';

export default function CardsScreen({ route, navigation }) {
  const { setId, setName, onSetUpdated } = route.params;
  const [cards, setCards] = useState([]);
  const [filteredCards, setFilteredCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingCards, setProcessingCards] = useState(new Set());

  useEffect(() => {
    navigation.setOptions({ title: setName });
    fetchCards();
  }, []);

  useEffect(() => {
    filterCards(cards, searchQuery);
  }, [searchQuery]);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API_URL}/sets/${setId}/cards`);
      setCards(response.data);
      filterCards(response.data, searchQuery);
    } catch (error) {
      console.error('Error fetching cards:', error);
      alert('Failed to load cards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateSetProgress = async () => {
    try {
      const response = await axios.get(`${API_URL}/sets`);
      const updatedSet = response.data.find(s => s.set_id === setId);
      
      if (updatedSet && onSetUpdated) {
        onSetUpdated(updatedSet);
      }
    } catch (error) {
      console.error('Error updating set progress:', error);
    }
  };

  const filterCards = (cardList, query) => {
    if (!query) {
      setFilteredCards(cardList);
      return;
    }
    
    const filtered = cardList.filter(card => 
      card.card_name.toLowerCase().includes(query.toLowerCase()) ||
      card.card_number.toLowerCase().includes(query.toLowerCase()) ||
      (card.rarity && card.rarity.toLowerCase().includes(query.toLowerCase())) ||
      (card.card_type && card.card_type.toLowerCase().includes(query.toLowerCase()))
    );
    
    setFilteredCards(filtered);
  };

  const toggleCard = async (card) => {
    if (processingCards.has(card.card_id)) {
      return;
    }

    setProcessingCards(prev => new Set(prev).add(card.card_id));

    try {
      if (card.owned) {
        await axios.delete(`${API_URL}/collection/${card.card_id}`);
      } else {
        await axios.post(`${API_URL}/collection`, {
          card_id: card.card_id,
          quantity: 1,
          acquired_date: new Date().toISOString().split('T')[0]
        });
      }

      const updatedCards = cards.map(c => 
        c.card_id === card.card_id 
          ? { ...c, owned: !c.owned, quantity: c.owned ? 0 : 1 }
          : c
      );
      setCards(updatedCards);
      filterCards(updatedCards, searchQuery);

      // Update parent screen's progress
      await updateSetProgress();

    } catch (error) {
      console.error('Error toggling card:', error);
      alert('Failed to update card. Please try again.');
    } finally {
      setProcessingCards(prev => {
        const newSet = new Set(prev);
        newSet.delete(card.card_id);
        return newSet;
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCards();
  };

  const renderCard = ({ item }) => {
    const isProcessing = processingCards.has(item.card_id);
    
    return (
      <TouchableOpacity
        style={[
          styles.cardItem,
          item.owned && styles.cardOwned,
          isProcessing && styles.cardProcessing
        ]}
        onPress={() => toggleCard(item)}
        disabled={isProcessing}
      >
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        
        <View style={styles.cardInfo}>
          <Text style={styles.cardNumber}>#{item.card_number}</Text>
          <Text style={styles.cardName} numberOfLines={2}>{item.card_name}</Text>
          <Text style={styles.cardRarity}>{item.rarity || 'Common'}</Text>
          
          {item.owned && (
            <Text style={styles.ownedBadge}>
              ✓ Owned {item.quantity > 1 ? `(x${item.quantity})` : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading cards...</Text>
      </View>
    );
  }

  const ownedCount = filteredCards.filter(c => c.owned).length;
  const totalCount = filteredCards.length;

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.header}>
        <View style={styles.progressSummary}>
          <Text style={styles.progressLabel}>Progress:</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${totalCount > 0 ? (ownedCount / totalCount * 100) : 0}%` }
                ]} 
              />
              <Text style={styles.progressText}>
                {totalCount > 0 ? Math.round((ownedCount / totalCount * 100)) : 0}%
              </Text>
            </View>
            <Text style={styles.progressCount}>{ownedCount}/{totalCount}</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cards..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery !== '' && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Cards */}
      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item) => item.card_id.toString()}
        numColumns={2}
        contentContainerStyle={styles.cardGrid}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No cards found</Text>
          </View>
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressSummary: {},
  progressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    marginRight: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#4caf50',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    zIndex: 1,
  },
  progressCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    minWidth: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  clearButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardGrid: {
    padding: 8,
  },
  cardItem: {
    flex: 1,
    margin: 5,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardOwned: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  cardProcessing: {
    opacity: 0.6,
  },
  cardImage: {
    width: 120,
    height: 168,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  placeholderImage: {
    width: 120,
    height: 168,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 12,
  },
  cardInfo: {
    alignItems: 'center',
    width: '100%',
  },
  cardNumber: {
    fontSize: 12,
    color: '#667eea',
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});