// Lista de aceites do cadastro (E7-01.1): termos, ciência da política e consentimentos.
import React, { useCallback, useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '@/utils/apiClient';
import {
  ConsentPolicy,
  ConsentPurpose,
  ConsentSelection,
  getConsentLabel,
  parseConsentPolicy,
} from '@/utils/consent';

type Role = 'gestante' | 'medico';

// Carrega a política vigente do perfil. `reload` é usado quando a versão muda durante o cadastro.
export function useConsentPolicy(role: Role) {
  const [policy, setPolicy] = useState<ConsentPolicy | null>(null);

  const reload = useCallback(async () => {
    try {
      const response = await api.get('/consents/policy', { params: { role } });
      setPolicy(parseConsentPolicy(response.data));
    } catch {
      setPolicy(null);
    }
  }, [role]);

  useEffect(() => {
    let ativo = true;
    api
      .get('/consents/policy', { params: { role } })
      .then((response) => {
        if (ativo) setPolicy(parseConsentPolicy(response.data));
      })
      .catch(() => {
        if (ativo) setPolicy(null);
      });
    return () => {
      ativo = false;
    };
  }, [role]);

  return { policy, reload };
}

function formatDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate;
}

type Props = {
  policy: ConsentPolicy | null;
  selection: ConsentSelection;
  onToggle: (purpose: string) => void;
  disabled?: boolean;
};

export default function ConsentChecklist({ policy, selection, onToggle, disabled }: Props) {
  const [reading, setReading] = useState<ConsentPurpose | null>(null);

  if (!policy) {
    return <Text style={styles.loading}>Carregando os termos...</Text>;
  }

  return (
    <View style={styles.container}>
      {policy.purposes.map((item) => {
        const checked = Boolean(selection[item.purpose]);
        return (
          <View key={item.purpose} style={[styles.item, item.highlighted && styles.highlighted]}>
            <TouchableOpacity
              accessibilityRole="checkbox"
              aria-checked={checked}
              aria-disabled={disabled}
              accessibilityLabel={getConsentLabel(item)}
              disabled={disabled}
              onPress={() => onToggle(item.purpose)}
              style={styles.checkboxTouch}
            >
              <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                {checked && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <Text style={[styles.label, item.highlighted && styles.labelHighlighted]}>
                {getConsentLabel(item)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Ler: ${item.title}`}
              onPress={() => setReading(item)}
              style={styles.readButton}
            >
              <Text style={styles.readText}>Ler (versão {item.version})</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <Modal visible={reading !== null} animationType="slide" transparent onRequestClose={() => setReading(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {reading && (
              <>
                <Text accessibilityRole="header" style={styles.modalTitle}>{reading.title}</Text>
                <Text style={styles.modalVersion}>
                  Versão {reading.version}
                  {reading.document_date ? ` — ${formatDate(reading.document_date)}` : ''}
                </Text>
                <ScrollView style={styles.modalScroll}>
                  <Text style={styles.modalText}>{reading.text}</Text>
                </ScrollView>
              </>
            )}
            <TouchableOpacity accessibilityRole="button" onPress={() => setReading(null)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 5, width: '100%' },
  loading: { alignSelf: 'flex-start', color: '#555', marginVertical: 8 },
  item: { marginBottom: 4 },
  highlighted: {
    backgroundColor: '#fff4d6',
    borderColor: '#8a6100',
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  checkboxTouch: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 44 },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#20B2AA',
    borderRadius: 6,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  checkboxChecked: { backgroundColor: '#20B2AA' },
  checkboxMark: { color: '#fff', fontWeight: 'bold' },
  label: { color: '#444', flex: 1, fontSize: 13 },
  labelHighlighted: { color: '#5c4100', fontWeight: 'bold' },
  readButton: { alignSelf: 'flex-start', justifyContent: 'center', marginLeft: 34, minHeight: 32 },
  readText: { color: '#20B2AA', fontWeight: 'bold', textDecorationLine: 'underline' },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '85%', maxWidth: 600, padding: 20, width: '100%' },
  modalTitle: { color: '#b34d7a', fontSize: 18, fontWeight: 'bold' },
  modalVersion: { color: '#555', marginBottom: 10, marginTop: 2 },
  modalScroll: { flexGrow: 0 },
  modalText: { color: '#333', fontSize: 15, lineHeight: 22 },
  modalCloseButton: { alignItems: 'center', backgroundColor: '#20B2AA', borderRadius: 25, marginTop: 16, paddingVertical: 12 },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
