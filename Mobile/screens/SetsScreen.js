import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_URL } from '../App';
import { useTheme } from '../ThemeContext';

export default function SetsScreen({ navigation }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [allSets, setAllSets] = useState([]);
  const [filteredSets, setFilteredSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [expandedEras, setExpandedEras] = useState({});

  const fetchSets = async () => {
    try {
      const response = await axios.get(`${API_URL}/sets`);
      setAllSets(response.data);
      filterSets(response.data, selectedLanguage, searchQuery);
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

  useEffect(() => {
    filterSets(allSets, selectedLanguage, searchQuery);
  }, [selectedLanguage, searchQuery]);

  const filterSets = (sets, language, query) => {
    let filtered = sets.filter(set => set.language === language);
    
    if (query) {
      filtered = filtered.filter(set => 
        set.set_name.toLowerCase().includes(query.toLowerCase()) ||
        set.set_code.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setFilteredSets(filtered);
  };

  const groupSetsByEra = () => {
    const grouped = {};
    filteredSets.forEach(set => {
      const era = set.era || 'Unknown Era';
      if (!grouped[era]) {
        grouped[era] = [];
      }
      grouped[era].push(set);
    });
    return grouped;
  };

  const toggleEra = (era) => {
    setExpandedEras(prev => ({
      ...prev,
      [era]: !prev[era]
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSets();
  };

  const handleSetUpdated = (updatedSet) => {
    // Update the set in the allSets array
    const updated = allSets.map(set => 
      set.set_id === updatedSet.set_id ? updatedSet : set
    );
    setAllSets(updated);
    filterSets(updated, selectedLanguage, searchQuery);
  };

  const renderSet = (item) => (
    <TouchableOpacity
      style={[styles.setCard, { backgroundColor: theme.cardBg, borderBottomColor: theme.border }]}
      onPress={() => navigation.navigate('Cards', { 
        setId: item.set_id, 
        setName: item.set_name,
        onSetUpdated: handleSetUpdated 
      })}
    >
      {item.image_url ? (
        <Image 
          source={{ uri: item.image_url }} 
          style={[styles.setImage, { backgroundColor: theme.background }]}
          resizeMode="contain"
        />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: theme.border }]}>
          <Text style={[styles.placeholderText, { color: theme.textTertiary }]}>No Image</Text>
        </View>
      )}
      <View style={styles.setInfo}>
        <Text style={[styles.setName, { color: theme.text }]} numberOfLines={2}>{item.set_name}</Text>
        <Text style={[styles.setCode, { color: theme.primary }]}>{item.set_code}</Text>
        <Text style={[styles.setMeta, { color: theme.textSecondary }]}>Released: {item.release_date || 'Unknown'}</Text>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${item.completion_percent}%`, backgroundColor: theme.success }
              ]} 
            />
            <Text style={[styles.progressText, { color: theme.text }]}>
              {item.completion_percent}%
            </Text>
          </View>
          <Text style={[styles.completion, { color: theme.textSecondary }]}>
            {item.owned_cards}/{item.total_cards}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEraSection = (era, sets) => {
    const isExpanded = expandedEras[era];
    
    return (
      <View key={era} style={[styles.eraSection, { backgroundColor: theme.cardBg, shadowColor: theme.shadow }]}>
        <TouchableOpacity 
          style={[styles.eraHeader, { backgroundColor: theme.primary }]}
          onPress={() => toggleEra(era)}
        >
          <View style={styles.eraHeaderLeft}>
            <Text style={styles.eraToggle}>{isExpanded ? '▼' : '▶'}</Text>
            <Text style={styles.eraTitle}>{era}</Text>
          </View>
          <View style={styles.eraCount}>
            <Text style={styles.eraCountText}>{sets.length} sets</Text>
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={[styles.eraContent, { backgroundColor: theme.background }]}>
            {sets.map(set => (
              <View key={set.set_id}>
                {renderSet(set)}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading sets...</Text>
      </View>
    );
  }

  const groupedSets = groupSetsByEra();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Dark Mode Toggle */}
      <View style={[styles.themeToggleContainer, { backgroundColor: theme.backgroundAlt, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: theme.primary }]}
          onPress={toggleTheme}
        >
          <Text style={styles.themeToggleText}>
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Language Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.backgroundAlt, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.tab, selectedLanguage === 'English' && { borderBottomColor: theme.primary }]}
          onPress={() => setSelectedLanguage('English')}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, selectedLanguage === 'English' && { color: theme.primary }]}>
            English Sets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedLanguage === 'Japanese' && { borderBottomColor: theme.primary }]}
          onPress={() => setSelectedLanguage('Japanese')}
        >
          <Text style={[styles.tabText, { color: theme.textSecondary }, selectedLanguage === 'Japanese' && { color: theme.primary }]}>
            Japanese Sets
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundAlt, borderBottomColor: theme.border }]}>
        <TextInput
          style={[styles.searchInput, { borderColor: theme.border, backgroundColor: theme.background, color: theme.text }]}
          placeholder="Search sets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.textTertiary}
        />
        {searchQuery !== '' && (
          <TouchableOpacity 
            style={[styles.clearButton, { backgroundColor: theme.error }]}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Nav Buttons */}
      <View style={[styles.quickNav, { backgroundColor: theme.backgroundAlt, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Collection')}
        >
          <Text style={styles.navButtonText}>📚 My Collection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Stats')}
        >
          <Text style={styles.navButtonText}>📊 Statistics</Text>
        </TouchableOpacity>
      </View>

      {/* Era Sections */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.keys(groupedSets).length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>No sets found</Text>
          </View>
        ) : (
          Object.entries(groupedSets).map(([era, sets]) => 
            renderEraSection(era, sets)
          )
        )}
      </ScrollView>
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
  
  // Theme Toggle
  themeToggleContainer: {
    padding: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  themeToggle: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  themeToggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
  },
  
  // Search
  searchContainer: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Quick Nav
  quickNav: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  navButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Era Section
  scrollView: {
    flex: 1,
  },
  eraSection: {
    marginBottom: 10,
    borderRadius: 12,
    marginHorizontal: 10,
    marginTop: 10,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  eraHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eraToggle: {
    color: '#fff',
    fontSize: 18,
    marginRight: 12,
    width: 20,
  },
  eraTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  eraCount: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  eraCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  eraContent: {
  },
  
  // Set Card
  setCard: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
  },
  setImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  setMeta: {
    fontSize: 11,
    marginBottom: 8,
  },
  
  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 8,
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
  completion: {
    fontSize: 11,
    fontWeight: 'bold',
    minWidth: 50,
  },
  
  // Empty State
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});