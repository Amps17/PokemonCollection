import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { API_URL } from '../App';
import { useTheme } from '../ThemeContext';

export default function StatsScreen() {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No statistics available
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Overall Stats */}
      <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Overall Collection</Text>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Cards:</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total_cards_owned}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Unique Cards:</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.unique_cards_owned}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Possible:</Text>
          <Text style={[styles.statValue, { color: theme.primary }]}>{stats.total_possible_cards}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completion:</Text>
          <Text style={[styles.statValue, { color: theme.success }]}>{stats.completion_percent}%</Text>
        </View>
        {stats.most_common_rarity && (
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Most Common:</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>{stats.most_common_rarity}</Text>
          </View>
        )}
      </View>

      {/* By Era */}
      {stats.by_era && stats.by_era.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Era</Text>
          {stats.by_era.map((era, index) => (
            <View key={index} style={[styles.statCard, { borderBottomColor: theme.border }]}>
              <Text style={[styles.statCardTitle, { color: theme.text }]}>{era.era}</Text>
              <Text style={[styles.statCardDetail, { color: theme.textSecondary }]}>
                {era.owned_cards} / {era.total_cards} cards
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[styles.progressFill, { 
                    width: `${era.completion_percent}%`,
                    backgroundColor: theme.success 
                  }]} 
                />
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {era.completion_percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* By Language */}
      {stats.by_language && stats.by_language.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Language</Text>
          {stats.by_language.map((lang, index) => (
            <View key={index} style={[styles.statCard, { borderBottomColor: theme.border }]}>
              <Text style={[styles.statCardTitle, { color: theme.text }]}>{lang.language}</Text>
              <Text style={[styles.statCardDetail, { color: theme.textSecondary }]}>
                {lang.owned_cards} / {lang.total_cards} cards
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[styles.progressFill, { 
                    width: `${lang.completion_percent}%`,
                    backgroundColor: theme.primary 
                  }]} 
                />
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {lang.completion_percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* By Rarity */}
      {stats.by_rarity && stats.by_rarity.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Rarity</Text>
          {stats.by_rarity.map((rarity, index) => (
            <View key={index} style={[styles.statCard, { borderBottomColor: theme.border }]}>
              <Text style={[styles.statCardTitle, { color: theme.text }]}>{rarity.rarity}</Text>
              <Text style={[styles.statCardDetail, { color: theme.textSecondary }]}>
                {rarity.owned_cards} / {rarity.total_cards} cards
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[styles.progressFill, { 
                    width: `${rarity.completion_percent}%`,
                    backgroundColor: theme.secondary 
                  }]} 
                />
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {rarity.completion_percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Top Complete Sets */}
      {stats.top_complete_sets && stats.top_complete_sets.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Most Complete Sets</Text>
          {stats.top_complete_sets.map((set, index) => (
            <View key={index} style={[styles.statCard, { borderBottomColor: theme.border }]}>
              <Text style={[styles.statCardTitle, { color: theme.text }]}>
                {set.set_name}
              </Text>
              <Text style={[styles.statCardDetail, { color: theme.textSecondary }]}>
                {set.set_code} • {set.owned_cards} / {set.total_cards} cards
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[styles.progressFill, { 
                    width: `${set.completion_percent}%`,
                    backgroundColor: theme.success 
                  }]} 
                />
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {set.completion_percent}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Least Complete Sets */}
      {stats.least_complete_sets && stats.least_complete_sets.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Least Complete Sets</Text>
          {stats.least_complete_sets.map((set, index) => (
            <View key={index} style={[styles.statCard, { borderBottomColor: theme.border }]}>
              <Text style={[styles.statCardTitle, { color: theme.text }]}>
                {set.set_name}
              </Text>
              <Text style={[styles.statCardDetail, { color: theme.textSecondary }]}>
                {set.set_code} • {set.owned_cards} / {set.total_cards} cards
              </Text>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View 
                  style={[styles.progressFill, { 
                    width: `${set.completion_percent}%`,
                    backgroundColor: theme.error 
                  }]} 
                />
                <Text style={[styles.progressText, { color: theme.text }]}>
                  {set.completion_percent}%
                </Text>
              </View>
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
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 15,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statCardDetail: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    zIndex: 1,
  },
});