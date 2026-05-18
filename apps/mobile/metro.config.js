const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ignora o arquivo problemático do @expo/cli
config.resolver.blockList = [
  /@expo\/cli\/static\/template\/\+native-intent\.ts/
];

module.exports = config;
