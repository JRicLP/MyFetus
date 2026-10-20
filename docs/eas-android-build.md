# Build Android para testes externos

O aplicativo mobile usa Expo SDK 56 e possui dois perfis EAS em
[`apps/mobile/eas.json`](../apps/mobile/eas.json):

| Perfil | Artefato | Uso |
|---|---|---|
| `preview` | APK | Instalação direta em aparelhos Android para validação do P.O. |
| `production` | AAB | Publicação em loja ou distribuição de produção |

O identificador Android do aplicativo é `com.myfetus.app`. O `versionCode`
inicial é `1`; o perfil `production` incrementa esse valor automaticamente.

## Configuração inicial do projeto EAS

Essa etapa precisa ser executada por alguém com acesso à conta Expo/EAS do
projeto. Ela vincula o repositório a um projeto EAS e grava apenas um
identificador público no `app.json`:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest project:info
```

O `init` é feito uma única vez. O token de login e qualquer segredo de
assinatura ficam fora do repositório.

## URL da API no APK

Um APK instalado fora do Expo Go não consegue usar `localhost` ou o host do
servidor Metro para acessar a API. Antes do build, cadastre a URL pública ou o
endereço acessível pelos aparelhos de teste no ambiente EAS:

```bash
npx eas-cli@latest env:create \
  --name EXPO_PUBLIC_API_URL \
  --value https://api.exemplo.test \
  --environment preview \
  --visibility plaintext
```

Para o perfil de produção, repita o comando com `--environment production` e
use a URL HTTPS de produção. O valor é incorporado ao bundle do app; não use
segredos nessa variável.

## Gerar o APK de validação

```bash
cd apps/mobile
npm run build:android:preview
```

Ao terminar, o EAS fornece uma URL para baixar o APK. Instale-o em um aparelho
Android de teste e valide login, navegação e chamadas à API. O build pode ser
acompanhado com:

```bash
npx eas-cli@latest build:list --platform android --limit 5
```

Para produção, gere o AAB com:

```bash
npm run build:android:production
```

## Critérios de aceite da E1-12

- o projeto EAS está vinculado ao aplicativo `com.myfetus.app`;
- o perfil `preview` produz um APK instalável sem Expo Go;
- o APK consegue alcançar a API usando `EXPO_PUBLIC_API_URL` configurada no
  ambiente EAS;
- o artefato e a URL de download são registrados na issue da tarefa;
- o build de produção gera AAB quando essa distribuição for necessária.

