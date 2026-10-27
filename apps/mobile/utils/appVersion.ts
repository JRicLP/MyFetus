/**
 * Versão exibida ao usuário (tela Sobre, E7-09).
 *
 * Com `appVersionSource: "local"` no eas.json, a versão e o número de build
 * do artefato vêm do app.json no momento do build, e é essa configuração que
 * o `expo-constants` expõe em `Constants.expoConfig`.
 *
 * Decisões da gestão (E7-09): mostrar a versão efetivamente instalada; o ciclo
 * acadêmico aparece separado da versão; fora de produção, identificar o
 * ambiente como "Ambiente de testes — uso acadêmico"; a data só aparece se o
 * build informar a data da compilação (EXPO_PUBLIC_BUILD_DATE).
 */
type VersionConfig = {
  version?: string;
  android?: { versionCode?: number };
  ios?: { buildNumber?: string };
} | null | undefined;

export type AppVersionInfo = {
  version: string;
  build: string | null;
  label: string;
};

export type BuildInfo = {
  environment?: string;
  buildDate?: string;
};

export const ACADEMIC_CYCLE = '2026.2';
export const TEST_ENVIRONMENT_LABEL = 'Ambiente de testes — uso acadêmico';

const UNKNOWN_VERSION = 'não identificada';

export function getAppVersionInfo(config: VersionConfig, platform: string): AppVersionInfo {
  const version = config?.version?.trim() || UNKNOWN_VERSION;

  let build: string | null = null;
  if (platform === 'android' && config?.android?.versionCode !== undefined) {
    build = String(config.android.versionCode);
  } else if (platform === 'ios' && config?.ios?.buildNumber) {
    build = config.ios.buildNumber;
  }

  return {
    version,
    build,
    label: build ? `${version} (build ${build})` : version,
  };
}

// Todo build que não for explicitamente de produção é tratado como ambiente de testes.
export function getEnvironmentLabel(environment: string | undefined): string | null {
  return environment?.trim().toLowerCase() === 'production' ? null : TEST_ENVIRONMENT_LABEL;
}

// Aceita apenas data ISO (AAAA-MM-DD...) e exibe no formato DD/MM/AAAA.
export function formatBuildDate(buildDate: string | undefined): string | null {
  const match = buildDate?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

export function readBuildInfo(): BuildInfo {
  return {
    environment: process.env.EXPO_PUBLIC_APP_ENVIRONMENT,
    buildDate: process.env.EXPO_PUBLIC_BUILD_DATE,
  };
}
