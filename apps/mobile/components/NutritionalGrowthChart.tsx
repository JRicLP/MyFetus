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
  IMC_BAIXO_PESO_ADEQUADO,
  IMC_ADEQUADO_SOBREPESO,
  IMC_SOBREPESO_OBESIDADE,
  IMC_CHART_DOMAIN,
  classificarIMCPorSemana,
} from '../utils/growthChartData';

type Props = {
  week: number;
  imc: number;
};

const COLORS = {
  baixoPeso: '#F1ECFB',
  adequado: '#DCCEF2',
  sobrepeso: '#B6A0E0',
  obesidade: '#8B7CC8',
  boundary: '#7C6BB0',
  point: '#886aea',
};

const X_TICKS = [6, 10, 14, 18, 22, 26, 30, 34, 38, 42];
const Y_TICKS = [17, 20, 25, 30, 35, 40];

const withY0 = (lower: { week: number; value: number }[], upper: { week: number; value: number }[]) =>
  upper.map((point, index) => ({ x: point.week, y0: lower[index].value, y: point.value }));

const minLine = IMC_CHART_DOMAIN.y[0];
const maxLine = IMC_CHART_DOMAIN.y[1];
const baixoPesoFloor = IMC_BAIXO_PESO_ADEQUADO.map((p) => ({ week: p.week, value: minLine }));
const obesidadeCeil = IMC_SOBREPESO_OBESIDADE.map((p) => ({ week: p.week, value: maxLine }));

export default function NutritionalGrowthChart({ week, imc }: Props) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.min(screenWidth - 40, 420);
  const classificacao = imc > 0 ? classificarIMCPorSemana(week, imc) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gráfico de acompanhamento nutricional</Text>

      <VictoryChart
        width={chartWidth}
        height={300}
        domain={IMC_CHART_DOMAIN}
        padding={{ top: 10, bottom: 45, left: 45, right: 10 }}
      >
        <VictoryArea
          data={withY0(baixoPesoFloor, IMC_BAIXO_PESO_ADEQUADO)}
          interpolation="monotoneX"
          style={{ data: { fill: COLORS.baixoPeso } }}
        />
        <VictoryArea
          data={withY0(IMC_BAIXO_PESO_ADEQUADO, IMC_ADEQUADO_SOBREPESO)}
          interpolation="monotoneX"
          style={{ data: { fill: COLORS.adequado } }}
        />
        <VictoryArea
          data={withY0(IMC_ADEQUADO_SOBREPESO, IMC_SOBREPESO_OBESIDADE)}
          interpolation="monotoneX"
          style={{ data: { fill: COLORS.sobrepeso } }}
        />
        <VictoryArea
          data={withY0(IMC_SOBREPESO_OBESIDADE, obesidadeCeil)}
          interpolation="monotoneX"
          style={{ data: { fill: COLORS.obesidade } }}
        />

        {[IMC_BAIXO_PESO_ADEQUADO, IMC_ADEQUADO_SOBREPESO, IMC_SOBREPESO_OBESIDADE].map((curve, index) => (
          <VictoryLine
            key={index}
            data={curve.map((p) => ({ x: p.week, y: p.value }))}
            interpolation="monotoneX"
            style={{ data: { stroke: COLORS.boundary, strokeWidth: 1.5 } }}
          />
        ))}

        {imc > 0 && (
          <VictoryScatter
            data={[{ x: week, y: imc }]}
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
          label="IMC (kg/m²)"
          style={{
            axisLabel: { padding: 32, fontSize: 12, fill: '#555' },
            tickLabels: { fontSize: 10, fill: '#555' },
          }}
        />
      </VictoryChart>

      <View style={styles.legendRow}>
        <LegendItem color={COLORS.baixoPeso} label="BP Baixo peso" />
        <LegendItem color={COLORS.adequado} label="A Adequado" />
        <LegendItem color={COLORS.sobrepeso} label="S Sobrepeso" />
        <LegendItem color={COLORS.obesidade} label="O Obesa" />
      </View>

      {classificacao && (
        <Text style={styles.classificationText}>
          IMC atual: {imc.toFixed(1)} kg/m² (semana {week}) — Classificação:{' '}
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
    backgroundColor: '#F8F6FF',
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
