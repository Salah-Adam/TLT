//  this tells Metro to use Expo's default configuration, 
// which registers ttf (and other font/asset extensions) as importable assets — 
// so the icon fonts resolve. 
// Every Expo project needs this file once you use native assets like icon fonts.


const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;