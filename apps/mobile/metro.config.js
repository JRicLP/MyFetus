const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  ...config.resolver.blockList,
  /@expo\/cli\/static\/template\/\+native-intent\.ts/,
  /[/\\]android[/\\](?:build|\.cxx)(?:[/\\].*)?$/,
  /[/\\][^/\\]+\.xcframework(?:[/\\].*)?$/,
];

module.exports = config;
