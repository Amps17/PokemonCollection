import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../App';

export default function SetsScreen({ navigation }) {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSets = async () => {
    try {
      const response = await axios.get(`${API_URL}/sets`);
      setSets(response.data);
    } catch (error) {
      console.error('Error fetching sets:', error);
      alert('Failed to load sets. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSets();
  };

  const renderSet = ({ item }) => (
    <TouchableOpacity
      style={styles.setCard}
      onPress={() => navigation.navigate('Cards', { setId: item.set_id, setName: item.set_name })}
    >
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.setImage} />
      )}
      <View style={styles.setInfo}>
        <Text style={styles.setName}>{item.set_name}</Text>
        <Text style={styles.setCode}>{item.set_code} • {item.era}</Text>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${item.completion_percent}%` }]} 
          />
        </View>
        <Text style={styles.completion}>
          {item.owned_cards}/{item.total_cards} ({item.completion_percent}%)
        </Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Collection')}
        >
          <Text style={styles.headerButtonText}>My Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.headerButtonText}>Stats</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={sets}
        renderItem={renderSet}
        keyExtractor={(item) => item.set_id.toString()}
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
  header: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerButton: {
    flex: 1,
    backgroundColor: '#e63946',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  headerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  setCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  setInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  setName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  setCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  completion: {
    fontSize: 12,
    color: '#666',
  },
});