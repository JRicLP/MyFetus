import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryScatter,
} from 'victory-native';
import {
  ALTURA_UTERINA_P10,
  ALTURA_UTERINA_P90,
  ALTURA_UTERINA_CHART_DOMAIN,
  classificarAlturaUterinaPorSemana,
} from '../utils/growthChartData';

type Props = {
  week: number;
  alturaUterina: number;
};

const COLORS = {
  band: '#E3F3FA',
  line: '#2F6FA3',
  point: '#886aea',
};

const X_TICKS = [13, 17, 21, 25, 29, 33, 37, 39];
const Y_TICKS = [7, 11, 15, 19, 23, 27, 31, 35];

const bandData = ALTURA_UTERINA_P90.map((point, index) => ({
  x: point.week,
  y0: ALTURA_UTERINA_P10[index].value,
  y: point.value,
}));

export default function UterineHeightChart({ week, alturaUterina }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 420);
  const classificacao = alturaUterina > 0 ? classificarAlturaUterinaPorSemana(week, alturaUterina) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Curva de altura uterina/idade gestacional</Text>

      <VictoryChart
        width={chartWidth}
        height={300}
        domain={ALTURA_UTERINA_CHART_DOMAIN}
        padding={{ top: 10, bottom: 45, left: 45, right: 10 }}
      >
        <VictoryArea
          data={bandData}
          interpolation="monotoneX"
          style={{ data: { fill: COLORS.band } }}
        />
        <VictoryLine
          data={ALTURA_UTERINA_P10.map((p) => ({ x: p.week, y: p.value }))}
          interpolation="monotoneX"
          style={{ data: { stroke: COLORS.line, strokeWidth: 1.5 } }}
        />
        <VictoryLine
          data={ALTURA_UTERINA_P90.map((p) => ({ x: p.week, y: p.value }))}
          interpolation="monotoneX"
          style={{ data: { stroke: COLORS.line, strokeWidth: 1.5 } }}
        />

        {alturaUterina > 0 && (
          <VictoryScatter
            data={[{ x: week, y: alturaUterina }]}
            size={6}
            style={{ data: { fill: '#FFFFFF', stroke: COLORS.point, strokeWidth: 3 } }}
          />
        )}

        <VictoryAxis
          tickValues={X_TICKS}
          label="Semanas de gestação"
          style={{
            axisLabel: { padding: 30, fontSize: 12, fill: '#555' },
            tickLabels: { fontSize: 10, fill: '#555' },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickValues={Y_TICKS}
          label="Altura uterina (cm)"
          style={{
            axisLabel: { padding: 32, fontSize: 12, fill: '#555' },
            tickLabels: { fontSize: 10, fill: '#555' },
          }}
        />
      </VictoryChart>

      <View style={styles.legendRow}>
        <LegendItem color={COLORS.line} label="P10 — limite inferior" />
        <LegendItem color={COLORS.line} label="P90 — limite superior" />
      </View>

      {classificacao && (
        <Text style={styles.classificationText}>
          Altura uterina atual: {alturaUterina.toFixed(1)} cm (semana {week}) — Classificação:{' '}
          <Text style={styles.classificationValue}>{classificacao}</Text>
        </Text>
      )}
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
    backgroundColor: '#F2FAFD',
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
  classificationText: {
    marginTop: 12,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  classificationValue: {
    fontWeight: 'bold',
  },
});
