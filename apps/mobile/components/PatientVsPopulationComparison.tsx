import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryLabel } from 'victory-native';

type Props = {
  title: string;
  unit: string;
  patientValue: number;
  averageValue: number;
  patientLabel?: string;
  averageLabel?: string;
};

const COLORS = {
  patient: '#886aea',
  average: '#2F6FA3',
};

export default function PatientVsPopulationComparison({
  title,
  unit,
  patientValue,
  averageValue,
  patientLabel = 'Paciente',
  averageLabel = 'Média populacional',
}: Props) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 420);

  if (patientValue <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.emptyText}>Dados da paciente indisponíveis para comparação.</Text>
      </View>
    );
  }

  const maxValue = Math.max(patientValue, averageValue);
  const diff = patientValue - averageValue;
  const diffPercent = averageValue !== 0 ? (Math.abs(diff) / averageValue) * 100 : 0;
  const comparativo =
    diffPercent < 1
      ? 'praticamente igual à média populacional'
      : diff > 0
      ? `${diffPercent.toFixed(1)}% acima da média populacional`
      : `${diffPercent.toFixed(1)}% abaixo da média populacional`;

  const labelStyle = { fontSize: 12, fontWeight: 'bold' as const, fill: '#333' };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <VictoryChart
        width={chartWidth}
        height={220}
        domain={{ y: [0, maxValue * 1.25] }}
        domainPadding={{ x: 50 }}
        padding={{ top: 30, bottom: 35, left: 45, right: 20 }}
      >
        <VictoryAxis style={{ tickLabels: { fontSize: 12, fill: '#555' } }} />
        <VictoryAxis
          dependentAxis
          label={unit}
          style={{
            axisLabel: { padding: 32, fontSize: 12, fill: '#555' },
            tickLabels: { fontSize: 10, fill: '#555' },
          }}
        />
        <VictoryBar
          data={[{ x: patientLabel, y: patientValue }]}
          style={{ data: { fill: COLORS.patient, width: 50 } }}
          labels={[patientValue.toFixed(1)]}
          labelComponent={<VictoryLabel dy={-10} style={labelStyle} />}
          cornerRadius={{ top: 6 }}
        />
        <VictoryBar
          data={[{ x: averageLabel, y: averageValue }]}
          style={{ data: { fill: COLORS.average, width: 50 } }}
          labels={[averageValue.toFixed(1)]}
          labelComponent={<VictoryLabel dy={-10} style={labelStyle} />}
          cornerRadius={{ top: 6 }}
        />
      </VictoryChart>

      <View style={styles.legendRow}>
        <LegendItem color={COLORS.patient} label={patientLabel} />
        <LegendItem color={COLORS.average} label={averageLabel} />
      </View>

      <Text style={styles.comparisonText}>
        {patientLabel}: <Text style={styles.comparisonValue}>{patientValue.toFixed(1)} {unit}</Text> —{' '}
        {comparativo}
      </Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F3EFFB',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
    marginVertical: 2,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 12,
    color: '#555',
  },
  comparisonText: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  comparisonValue: {
    fontWeight: 'bold',
  },
});
