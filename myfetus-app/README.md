# myFetus 
## Começando

Essas instruções vão te ajudar a rodar o projeto React Native localmente.

### Pré-requisitos

Certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (recomendado: versão 14 ou superior)
- [Yarn](https://classic.yarnpkg.com/lang/en/) ou npm
- [React Native CLI](https://reactnative.dev/docs/environment-setup)

> ⚠️ Siga as instruções oficiais para preparar seu ambiente:
> [Guia oficial React Native](https://reactnative.dev/docs/environment-setup)  
> Escolha "React Native CLI" e selecione o sistema operacional correto.

- [Expo Go para Android](https://play.google.com/store/apps/details?id=host.exp.exponent&referrer=www)
- [Expo Go para IOS](https://itunes.apple.com/app/apple-store/id982107779)

### Instalando dependências

```bash
git clone https://github.com/myfetus/myfetus-app.git
cd myfetus-app

# Recomendado (instala o app que fica em ./myFetus)
npm install

# Alternativa equivalente:
# cd myFetus
# npm install

# (Se preferir Yarn, rode os comandos dentro de ./myFetus)
```

### Rodando o app

Na raiz (`myfetus-app/`):

```bash
npm start
```

Se aparecer `TypeError: fetch failed` durante o start do Expo, rode em modo offline (mais estável em redes/proxy):

```bash
npm run start:offline
```

### [Configurando a database](https://github.com/myfetus/myfetus-app/tree/backend/myFetus/backend/PostgresQL.md)

