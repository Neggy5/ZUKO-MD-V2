/**
 * ZUKO-MD Bot Configuration v2.2.0
 * 
 * Comprehensive configuration for ZUKO-MD WhatsApp Bot
 * Last Updated: July 2024
 */

const settings = {
  // ==================== CORE IDENTITY ====================
  identity: {
    name: "𝐙𝐔𝐊𝐎-𝐌𝐃",
    version: "2.2.0",
    description: "ALL HAIL ZUKO 👽🚀🔥",
    prefix: ".",
    themeEmoji: "👽",
    defaultLanguage: "en"
  },

  // ==================== OWNERSHIP ====================
  ownership: {
    mainOwner: {
      name: "𝐙𝐔𝐊𝐎 👽",
      number: "27810971476", // Without +
      jid: "27810971476@s.whatsapp.net" // Auto-generated
    },
    secondaryOwners: [
      // Example: {
      //   name: "Admin 2",
      //   number: "1234567890",
      //   level: 2 // 1=full access, 2=limited
      // }
    ],
    developer: "Neggy5"
  },

  // ==================== SECURITY ====================
  security: {
    antiSpam: {
      enabled: true,
      maxCommandsPerMinute: 30,
      banDuration: "30m",
      action: "warn", // "warn", "mute", or "kick"
      muteDuration: "10m",
      warningMessage: "⚠️ *Slow down!* You're sending too many messages.",
      actionMessage: "🚫 *Spam detected!* You've been {action} for spamming.",
      exemptUsers: ["27810971476@s.whatsapp.net"] // Owner is exempt
    },
    authentication: {
      pairingCode: false,
      qrTimeout: 120 // Seconds
    },
    contentFilter: {
      antiLink: {
        enabled: true,
        whitelist: ["github.com", "youtube.com"]
      },
      antiViruses: true
    },
    anticall: {
      enabled: true,
      rejectCallMsg: "🚫 *Bot does not accept calls!*",
      autoBlockCaller: false,
      onlyAllowOwnerCall: true,
      exemptNumbers: ["27810971476"] // Owner's number
    },
    antiMention: {
      enabled: true,
      maxMentions: 5, // Max allowed mentions per message
      action: "warn", // "warn", "mute", or "kick"
      muteDuration: "10m",
      warningMsg: "⚠️ *Please don't mention many members at once!*",
      actionMsg: "🚫 *Excessive mentions detected!* You've been {action}.",
      exemptRoles: ["admin", "owner"] // Roles that can bypass
    }
  },

  // ==================== MEDIA SETTINGS ====================
  media: {
    stickers: {
      packName: "𝐙𝐔𝐊𝐎-𝐌𝐃",
      author: "zuko",
      quality: 100,
      type: "full", // "full" or "crop"
      categories: ["fun", "meme", "game"]
    },
    uploads: {
      maxSize: 100, // MB
      allowedTypes: ["image", "video", "audio", "document"]
    },
    autoDownload: {
      enabled: true,
      maxFileSize: 50 // MB
    }
  },

  // ==================== API CONFIGURATION ====================
  apiKeys: {
    giphy: "YOUR_GIPHY_API_KEY", // Replace with environment variable
    unsplash: "", // For high-quality images
    openWeather: "", // Weather data
    googleCustomSearch: "", // For web searches
    rapidApi: {
      key: 'your-rapidapi-key',
      endpoints: {
        instagram: "instagram-downloader",
        tiktok: "tiktok-downloader"
      }
    },
    simsimi: {
      key: "",
      lang: "en"
    }
  },

  // ==================== FEATURE TOGGLES ====================
  features: {
    greetings: {
      welcome: true,
      goodbye: true,
      antiDelete: true
    },
    utilities: {
      chatbot: {
        enabled: true,
        provider: "simsimi" // or "dialogflow"
      },
      downloader: {
        youtube: true,
        instagram: true,
        tiktok: true,
        facebook: false
      },
      ai: {
        imageGeneration: false,
        chatGPT: false,
        gemini: false
      },
      tools: {
        qrGenerator: true,
        urlShortener: false,
        currencyConverter: true
      }
    },
    moderation: {
      autoWarn: true,
      autoKick: false,
      wordFilter: ["badword1", "badword2"],
      autoPromote: false
    },
    games: {
      enabled: true,
      tictactoe: true,
      hangman: true,
      trivia: false
    }
  },

  // ==================== DATABASE ====================
  database: {
    enabled: false,
    type: "mongoDB", // or "sqlite"
    url: "mongodb://localhost:27017/zuko-bot",
    backup: {
      enabled: true,
      interval: "24h" // Daily backups
    }
  },

  // ==================== COMMUNICATION ====================
  channels: {
    updates: "https://whatsapp.com/channel/0029Vb5iurcFsn0g8SxxBs0p",
    supportGroup: "",
    github: "https://github.com/neggy5",
    youtube: "https://youtube.com/@BOTKÍNG001",
    telegram: ""
  },

  // ==================== PERFORMANCE ====================
  performance: {
    cacheEnabled: true,
    cacheTTL: "1h", // 1 hour cache
    cleanupInterval: "6h",
    maxMemoryUsage: "512MB",
    messageHistoryLimit: 100 // Max stored messages
  },

  // ==================== DEBUGGING ====================
  debugging: {
    enabled: false,
    level: "info", // error, warn, info, debug
    logToFile: true,
    logFile: "zuko-errors.log",
    verbose: false
  }
};

// ==================== VALIDATION & POST-PROCESSING ====================
(function() {
  // Auto-generate JID for main owner
  settings.ownership.mainOwner.jid = `${settings.ownership.mainOwner.number}@s.whatsapp.net`;

  // Validate owner number
  if (!/^\d+$/.test(settings.ownership.mainOwner.number)) {
    console.error("❌ Invalid owner number format. Must contain only digits");
    process.exit(1);
  }

  // Set default API endpoints
  if (settings.apiKeys.rapidApi.key) {
    settings.apiKeys.rapidApi.baseUrl = "https://social-media-downloader.p.rapidapi.com";
  }

  // Convert string durations to milliseconds
  const timeConversions = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  const timePaths = [
    'security.antiSpam.banDuration',
    'security.antiSpam.muteDuration',
    'database.backup.interval',
    'performance.cacheTTL',
    'performance.cleanupInterval'
  ];

  timePaths.forEach(path => {
    const parts = path.split('.');
    let obj = settings;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    const value = obj[parts[parts.length - 1]];
    if (typeof value === 'string') {
      const num = parseInt(value);
      const unit = value.replace(/[0-9]/g, '');
      if (timeConversions[unit]) {
        obj[parts[parts.length - 1]] = num * timeConversions[unit];
      }
    }
  });

  // Ensure exempt users array exists
  if (!Array.isArray(settings.security.antiSpam.exemptUsers)) {
    settings.security.antiSpam.exemptUsers = [];
  }
  if (!Array.isArray(settings.security.anticall.exemptNumbers)) {
    settings.security.anticall.exemptNumbers = [];
  }

  // Always include owner in exempt lists
  if (!settings.security.antiSpam.exemptUsers.includes(settings.ownership.mainOwner.jid)) {
    settings.security.antiSpam.exemptUsers.push(settings.ownership.mainOwner.jid);
  }
  if (!settings.security.anticall.exemptNumbers.includes(settings.ownership.mainOwner.number)) {
    settings.security.anticall.exemptNumbers.push(settings.ownership.mainOwner.number);
  }
})();

module.exports = settings;