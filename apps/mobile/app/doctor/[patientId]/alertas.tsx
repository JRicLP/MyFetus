import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUrl } from '../../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TrafficLevel = 'green' | 'yellow' | 'red';

type AlertCategory = {
  level: TrafficLevel;
  label: string;
  detail: string;
};

type AlertsData = {
  patient_id: string;
  patient_name: string;
  overall_level: TrafficLevel;
  alert_counts: { green: number; yellow: number; red: number };
  categories: Record<string, AlertCategory | null>;
};

const TRAFFIC_CONFIG: Record<TrafficLevel, { color: string; bg: string; icon: string; label: string }> = {
  green: { color: '#27ae60', bg: '#e8f8f0', icon: 'checkmark-circle', label: 'Normal' },
  yellow: { color: '#f39c12', bg: '#fef9e7', icon: 'warning', label: 'Atenção' },
  red: { color: '#e74c3c', bg: '#fdedec', icon: 'alert-circle', label: 'Crítico' },
};

const CATEGORY_LABELS: Record<string, string> = {
  idade_materna: 'Idade Materna',
  pressao_arterial: 'Pressão Arterial',
  glicemia: 'Glicemia',
  imc: 'IMC',
  altura_uterina: 'Altura Uterina',
  frequencia_cardiaca_fetal: 'FC Fetal',
  semanas_gestacao: 'Semanas de Gestação',
  antecedentes_familiares: 'Antecedentes Familiares',
  antecedentes_clinicos: 'Antecedentes Clínicos',
  gestacao_anterior: 'Gestação Anterior',
  gestacao_atual: 'Gestação Atual',
  vacinas: 'Vacinas',
};

function TrafficLightCircle({ level, size = 14 }: { level: TrafficLevel; size?: number }) {
  const cfg = TRAFFIC_CONFIG[level];
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: cfg.color }]} />
  );
}

function OverallGauge({ level, counts }: { level: TrafficLevel; counts: { green: number; yellow: number; red: number } }) {
  const total = counts.green + counts.yellow + counts.red;
  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeRow}>
        {(['green', 'yellow', 'red'] as TrafficLevel[]).map((lvl) => {
          const cfg = TRAFFIC_CONFIG[lvl];
          const pct = total > 0 ? (counts[lvl] / total) * 100 : 0;
          return (
            <View key={lvl} style={[styles.gaugeBar, { flex: pct || 0.01, backgroundColor: cfg.color }]} />
          );
        })}
      </View>
      <View style={styles.gaugeLegend}>
        {(['green', 'yellow', 'red'] as TrafficLevel[]).map((lvl) => {
          const cfg = TRAFFIC_CONFIG[lvl];
          return (
            <View key={lvl} style={styles.gaugeLegendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.legendText}>{counts[lvl]} {lvl === 'green' ? 'Normais' : lvl === 'yellow' ? 'Atenção' : 'Críticos'}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AlertCard({ categoryKey, alert }: { categoryKey: string; alert: AlertCategory }) {
  const cfg = TRAFFIC_CONFIG[alert.level];
  return (
    <View style={[styles.card, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <TrafficLightCircle level={alert.level} size={18} />
          <Text style={styles.cardTitle}>{CATEGORY_LABELS[categoryKey] || categoryKey}</Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
          <Text style={[styles.levelText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={styles.cardLabel}>{alert.label}</Text>
      <Text style={styles.cardDetail}>{alert.detail}</Text>
    </View>
  );
}

export default function AlertasScreen() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams();
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('authToken');
        const response = await fetch(apiUrl(`/api/pregnants/${patientId}/alerts`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) throw new Error('Erro ao carregar alertas');
        const json = await response.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro de rede');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [patientId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#886aea" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.errorText}>{error || 'Dados não encontrados'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const overallCfg = TRAFFIC_CONFIG[data.overall_level];
  const entries = Object.entries(data.categories).filter(([, v]) => v !== null) as [string, AlertCategory][];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard de Alertas</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.patientName}>{data.patient_name}</Text>

        <View style={[styles.overallBanner, { backgroundColor: overallCfg.bg }]}>
          <Ionicons name={overallCfg.icon as any} size={40} color={overallCfg.color} />
          <View style={styles.overallTextWrap}>
            <Text style={[styles.overallLabel, { color: overallCfg.color }]}>Classificação Geral</Text>
            <Text style={[styles.overallValue, { color: overallCfg.color }]}>{overallCfg.label}</Text>
          </View>
        </View>

        <OverallGauge level={data.overall_level} counts={data.alert_counts} />

        <Text style={styles.sectionTitle}>Categorias de Risco</Text>

        {entries.map(([key, alert]) => (
          <AlertCard key={key} categoryKey={key} alert={alert} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f3fa' },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  patientName: { fontSize: 24, fontWeight: 'bold', color: '#b34d7a', marginBottom: 20 },
  overallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  overallTextWrap: { flex: 1 },
  overallLabel: { fontSize: 14, fontWeight: '600' },
  overallValue: { fontSize: 26, fontWeight: 'bold', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flexShrink: 1 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: { fontSize: 12, fontWeight: 'bold' },
  cardLabel: { fontSize: 14, color: '#555', marginBottom: 4 },
  cardDetail: { fontSize: 13, color: '#888' },
  circle: { marginRight: 0 },
  gaugeContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2 },
  gaugeRow: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  gaugeBar: { height: '100%' },
  gaugeLegend: { flexDirection: 'row', justifyContent: 'space-around' },
  gaugeLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#555' },
  errorText: { textAlign: 'center', marginTop: 60, fontSize: 16, color: '#e74c3c' },
  backButton: { backgroundColor: '#886aea', padding: 15, borderRadius: 25, alignItems: 'center', marginTop: 20, marginHorizontal: 20 },
  backButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
