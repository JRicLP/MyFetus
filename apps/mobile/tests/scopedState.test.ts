import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getScopedItem, setScopedItem } from '../utils/scopedStorage';
import { localDateKey } from '../utils/gestationDate';
import { getWaterAmountForDate } from '../utils/waterTracking';
import {
  clearStoredSessionMetadata,
  SESSION_METADATA_KEYS,
} from '../utils/sessionStorageCore';

const WATER_KEY = 'waterHistory';

const localStorageState = new Map<string, string>();
const localStorageMock = {
  get length() {
    return localStorageState.size;
  },
  clear() {
    localStorageState.clear();
  },
  getItem(key: string) {
    return localStorageState.get(key) ?? null;
  },
  key(index: number) {
    return Array.from(localStorageState.keys())[index] ?? null;
  },
  removeItem(key: string) {
    localStorageState.delete(key);
  },
  setItem(key: string, value: string) {
    localStorageState.set(key, value);
  },
};

Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: { localStorage: localStorageMock },
});

describe('estado local por usuário e calendário', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('mantém os dados isolados ao fazer logout e trocar de conta', async () => {
    await setScopedItem(
      101,
      WATER_KEY,
      JSON.stringify([{ date: '2026-10-21', amount: 700 }])
    );
    await setScopedItem(
      202,
      WATER_KEY,
      JSON.stringify([{ date: '2026-10-21', amount: 1200 }])
    );

    const accountTwoHistory = await getScopedItem(202, WATER_KEY);
    const accountOneHistory = await getScopedItem(101, WATER_KEY);

    assert.equal(accountTwoHistory, '[{"date":"2026-10-21","amount":1200}]');
    assert.equal(accountOneHistory, '[{"date":"2026-10-21","amount":700}]');
    assert.notEqual(accountTwoHistory, accountOneHistory);
  });

  it('migra o estado legado para a conta sem misturá-lo com outra conta', async () => {
    await AsyncStorage.setItem(
      '@myFetus:waterHistory',
      JSON.stringify([{ date: '2026-10-21', amount: 500 }])
    );

    const migrated = await getScopedItem(101, WATER_KEY, '@myFetus:waterHistory');

    assert.equal(migrated, '[{"date":"2026-10-21","amount":500}]');
    assert.equal(await AsyncStorage.getItem('@myFetus:waterHistory'), null);
    assert.equal(
      await getScopedItem(202, WATER_KEY),
      null,
      'a conta diferente não deve herdar o estado legado'
    );
  });

  it('encerra a sessão sem apagar os dados locais da conta', async () => {
    await setScopedItem(
      101,
      WATER_KEY,
      JSON.stringify([{ date: '2026-10-21', amount: 700 }])
    );
    for (const key of SESSION_METADATA_KEYS) {
      await AsyncStorage.setItem(key, 'session-value');
    }

    await clearStoredSessionMetadata(keys => AsyncStorage.multiRemove([...keys]));

    for (const key of SESSION_METADATA_KEYS) {
      assert.equal(await AsyncStorage.getItem(key), null);
    }
    assert.equal(
      await getScopedItem(101, WATER_KEY),
      '[{"date":"2026-10-21","amount":700}]'
    );
  });

  it('reinicia o total diário na virada do calendário local', () => {
    const beforeMidnight = new Date(2026, 9, 21, 23, 59);
    const afterMidnight = new Date(2026, 9, 22, 0, 1);
    const history = [
      { date: localDateKey(beforeMidnight), amount: 700 },
    ];

    assert.equal(getWaterAmountForDate(history, localDateKey(beforeMidnight)), 700);
    assert.equal(getWaterAmountForDate(history, localDateKey(afterMidnight)), 0);
  });
});
