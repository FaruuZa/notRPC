'use strict';

if (typeof require !== 'undefined') {
  try {
    var Discord = require('./Discord.cjs');
    var events = require('./schema/events.cjs');
    var common = require('./schema/common.cjs');
    var responses = require('./schema/responses.cjs');
    var Constants = require('./Constants.cjs');
    var PermissionUtils = require('./utils/PermissionUtils.cjs');
    var PriceUtils = require('./utils/PriceUtils.cjs');
    var mock = require('./mock.cjs');
    var patchUrlMappings = require('./utils/patchUrlMappings.cjs');

    const { Commands } = common;

    if (typeof exports !== 'undefined') {
      exports.DiscordSDK = Discord.DiscordSDK;
      Object.defineProperty(exports, "Events", {
        enumerable: true,
        get: function () { return events.Events; }
      });
      exports.Common = common;
      exports.Responses = responses;
      Object.defineProperty(exports, "Orientation", {
        enumerable: true,
        get: function () { return Constants.Orientation; }
      });
      exports.Permissions = Constants.Permissions;
      Object.defineProperty(exports, "Platform", {
        enumerable: true,
        get: function () { return Constants.Platform; }
      });
      Object.defineProperty(exports, "RPCCloseCodes", {
        enumerable: true,
        get: function () { return Constants.RPCCloseCodes; }
      });
      Object.defineProperty(exports, "RPCErrorCodes", {
        enumerable: true,
        get: function () { return Constants.RPCErrorCodes; }
      });
      exports.PermissionUtils = PermissionUtils.default;
      exports.PriceUtils = PriceUtils.default;
      exports.DiscordSDKMock = mock.DiscordSDKMock;
      exports.attemptRemap = patchUrlMappings.attemptRemap;
      exports.patchUrlMappings = patchUrlMappings.patchUrlMappings;
      exports.Commands = Commands;
    }
  } catch (err) {
    // Suppress CommonJS require errors in unbundled environment
  }
} else {
  // Standalone browser / client environment
  if (typeof window !== 'undefined') {
    window.DiscordSDK = window.DiscordSDK || null;
  }
}
