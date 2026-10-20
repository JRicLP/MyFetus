import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { ChecklistItem, checklistData } from '../data/checklistData';
import { getLastPeriod, calculateGestationWeek } from '../../utils/gestationUtils';
import { useSession } from '@/contexts/SessionContext';
import { getScopedItem, setScopedItem } from '@/utils/scopedStorage';

const WEB_MAX_WIDTH = 430;

const TRIMESTER_RANGES = {
  1: { start: 1, end: 13 },
  2: { start: 14, end: 26 },
  3: { start: 27, end: 40 }
};

const CHECKLIST_STATE_KEY = '@myFetus:checklistState';
const CHECKLIST_SCOPED_KEY = 'checklistState';

function getTrimesterItems(trimester: number, completionState: Record<string, boolean>): ChecklistItem[] {
  const range = TRIMESTER_RANGES[trimester as keyof typeof TRIMESTER_RANGES];
  return checklistData
    .filter((checklist) => {
      const [start, end] = checklist.weekRange.split('-').map(Number);
      return start >= range.start && end <= range.end;
    })
    .flatMap((checklist) => checklist.items.map((item) => ({
      ...item,
      completed: completionState[item.id] || false,
    })));
}

export default function ChecklistScreen() {
  const { width: windowWidth, height } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, WEB_MAX_WIDTH) : windowWidth;
  const styles = React.useMemo(() => createStyles(width, height), [width, height]);
  const { user } = useSession();

  const [currentTrimester, setCurrentTrimester] = useState(1);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [savedState, setSavedState] = useState<Record<string, boolean>>({});

  // Carrega o estado salvo do checklist
  const loadSavedState = useCallback(async () => {
    try {
      if (!user) return {};
      const savedState = await getScopedItem(user.id, CHECKLIST_SCOPED_KEY, CHECKLIST_STATE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setSavedState(parsedState);
        return parsedState;
      }
    } catch {
      // erro tratado na UI; sem log para não expor dados
    }
    return {};
  }, [user]);

  // Salva o estado atual do checklist
  const saveState = useCallback((itemId: string, completed: boolean) => {
    setSavedState((currentState) => {
      const nextState = {
        ...currentState,
        [itemId]: completed
      };
      if (user) {
        void setScopedItem(user.id, CHECKLIST_SCOPED_KEY, JSON.stringify(nextState)).catch(
          () => undefined
        );
      }

      return nextState;
    });
  }, [user]);

  useEffect(() => {
    const loadGestationData = async () => {
      if (!user) return;
      const lastPeriod = await getLastPeriod(user.id);
      if (lastPeriod) {
        const result = calculateGestationWeek(lastPeriod);
        const trimester = result.weeks <= 13 ? 1 : result.weeks <= 26 ? 2 : 3;
        setCurrentTrimester(trimester);

        const completionState = await loadSavedState();
        setChecklistItems(getTrimesterItems(trimester, completionState));
      }
    };

    void loadGestationData();
  }, [user, loadSavedState]);

  const changeTrimester = (trimester: number) => {
    setCurrentTrimester(trimester);
    setChecklistItems(getTrimesterItems(trimester, savedState));
  };

  const toggleItem = (id: string) => {
    const newItems = checklistItems.map(item => {
      if (item.id === id) {
        const newCompleted = !item.completed;
        // Salva o estado imediatamente
        saveState(id, newCompleted);
        return { ...item, completed: newCompleted };
      }
      return item;
    });
    setChecklistItems(newItems);
  };

  const completedCount = checklistItems.filter(item => item.completed).length;
  const progressPercentage = checklistItems.length > 0 
    ? (completedCount / checklistItems.length) * 100 
    : 0;

  return (
    <LinearGradient
      colors={['#cce5f6', '#f8cde9']}
      style={styles.container}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Checklist do {currentTrimester}º Trimestre</Text>
          <View style={styles.trimesterNavigation}>
            <TouchableOpacity
              style={[styles.trimesterButton, currentTrimester === 1 && styles.activeTrimester]}
              onPress={() => changeTrimester(1)}
            >
              <Text style={[styles.trimesterButtonText, currentTrimester === 1 && styles.activeTrimesterText]}>1º</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trimesterButton, currentTrimester === 2 && styles.activeTrimester]}
              onPress={() => changeTrimester(2)}
            >
              <Text style={[styles.trimesterButtonText, currentTrimester === 2 && styles.activeTrimesterText]}>2º</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.trimesterButton, currentTrimester === 3 && styles.activeTrimester]}
              onPress={() => changeTrimester(3)}
            >
              <Text style={[styles.trimesterButtonText, currentTrimester === 3 && styles.activeTrimesterText]}>3º</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {checklistItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.itemContainer}
              onPress={() => toggleItem(item.id)}
            >
              <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
                {item.completed && (
                  <FontAwesome name="check" size={12} color="#fff" />
                )}
              </View>
              <View style={styles.itemContent}>
                <Text
                  style={[
                    styles.itemTitle,
                    item.completed && styles.completedText,
                  ]}
                >
                  {item.title}
                </Text>
                {item.description && (
                  <Text
                    style={[
                      styles.itemDescription,
                      item.completed && styles.completedText,
                    ]}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {completedCount} de {checklistItems.length} tarefas concluídas
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progress,
                { width: `${progressPercentage}%` }
              ]}
            />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const createStyles = (width: number, height: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: width,
    alignSelf: 'center',
  },
  header: {
    paddingTop: height * 0.06,
    paddingBottom: height * 0.02,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: '#20B2AA',
    marginBottom: 10,
  },
  trimesterNavigation: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  trimesterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#20B2AA',
  },
  activeTrimester: {
    backgroundColor: '#20B2AA',
  },
  trimesterButtonText: {
    fontSize: width * 0.04,
    color: '#20B2AA',
    fontWeight: '600',
  },
  activeTrimesterText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 15,
  },
  scrollContent: {
    paddingBottom: 15,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#20B2AA',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#20B2AA',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: width * 0.035,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: width * 0.03,
    color: '#666',
    lineHeight: 18,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  progressContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressText: {
    fontSize: width * 0.035,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: '#20B2AA',
    borderRadius: 4,
  },
});
