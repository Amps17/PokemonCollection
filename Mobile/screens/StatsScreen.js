import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { API_URL } from '../App';

export default function StatsScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e63946" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centered}>
        <Text>No statistics available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Overall Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Collection</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Cards:</Text>
          <Text style={styles.statValue}>{stats.total_cards_owned}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Unique Cards:</Text>
          <Text style={styles.statValue}>{stats.unique_cards_owned}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Completion:</Text>
          <Text style={styles.statValue}>{stats.completion_percent}%</Text>
        </View>
      </View>

      {/* By Era */}
      {stats.by_era && stats.by_era.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Era</Text>
          {stats.by_era.map((era, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statCardTitle}>{era.era}</Text>
              <Text style={styles.statCardDetail}>
                {era.owned_cards} / {era.total_cards} ({era.completion_percent}%)
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${era.completion_percent}%` }]} 
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* By Rarity */}
      {stats.by_rarity && stats.by_rarity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By Rarity</Text>
          {stats.by_rarity.map((rarity, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statCardTitle}>{rarity.rarity}</Text>
              <Text style={styles.statCardDetail}>
                {rarity.owned_cards} / {rarity.total_cards} ({rarity.completion_percent}%)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Complete Sets */}
      {stats.top_complete_sets && stats.top_complete_sets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Complete Sets</Text>
          {stats.top_complete_sets.map((set, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statCardTitle}>
                {index + 1}. {set.set_name}
              </Text>
              <Text style={styles.statCardDetail}>
                {set.owned_cards} / {set.total_cards} ({set.completion_percent}%)
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e63946',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardDetail: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
});