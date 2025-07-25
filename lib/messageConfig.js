module.exports = {
  // Bot Information
  botName: "ZUKO-MD",
  ownerName: "ZÜKØ",
  ownerNumber: "27810971476",
  prefix: ".",
  sessionName: "session",
  stickerAuthor: "ZUKO-MD",
  
  // API Keys
  openaiKey: "your-openai-key",
  unsplashKey: "your-unsplash-key",
  
  // Database Configuration
  database: {
    url: "mongodb://localhost:27017",
    name: "zukodb"
  },
  
  // System Messages
  messages: {
    adminOnly: "🚫 *This command is only for admins!*",
    botAdmin: "🤖 *I need to be admin to perform this action!*",
    ownerOnly: "👑 *This command is only for my owner!*",
    groupOnly: "👥 *This command only works in groups!*",
    privateOnly: "🔒 *This command only works in private chat!*",
    error: "❌ *An error occurred!*",
    wait: "⏳ *Please wait...*",
    success: "✅ *Done!*",
    notFound: "🔍 *Not found!*",
    noResult: "📭 *No results found!*",
    banned: "🚷 *You are banned from using this bot!*",
    mediaError: "📷 *Please reply to/send a valid media!*",
    linkError: "🔗 *Please provide a valid link!*",
    quoteError: "💬 *Please reply to a message!*",
    textError: "📝 *Please provide text!*",
    numberError: "🔢 *Please provide a valid number!*",
    limitReached: "⛔ *Command limit reached! Try again later.*",
    cooldown: "⏱️ *Please wait %s second(s) before using this command again.*",
    
    // Welcome/Goodbye Messages
    welcome: (user, group) => `👋 Welcome *${user}* to *${group}*!`,
    goodbye: (user) => `👋 Goodbye *${user}*! We'll miss you!`,
    
    // AI Responses
    ai: {
      thinking: "🤔 *Let me think about that...*",
      response: (question, answer) => `❓ *Question:* ${question}\n\n💡 *Answer:* ${answer}`
    },
    
    // Downloader Messages
    download: {
      start: "⬇️ *Starting download...*",
      success: (type) => `✅ *${type} downloaded successfully!*`,
      error: "❌ *Download failed!*"
    },
    
    // Sticker Messages
    sticker: {
      created: "🖼️ *Sticker created!*",
      animated: "🎞️ *Animated sticker created!*",
      error: "❌ *Failed to create sticker!*"
    },
    
    // Game Messages
    game: {
      start: "🎮 *Game started!*",
      win: "🏆 *Congratulations, you won!*",
      lose: "😢 *Better luck next time!*",
      draw: "🤝 *It's a draw!*"
    },
    
    // Music Player
    music: {
      playing: (title) => `🎵 Now playing: *${title}*`,
      added: (title) => `➕ Added to queue: *${title}*`,
      notFound: "🔍 *Song not found!*"
    },
    
    // NSFW Filter
    nsfw: {
      detected: "🔞 *NSFW content detected!*",
      notAllowed: "⛔ *NSFW commands are not allowed in this group!*"
    },
    
    // Economy System
    economy: {
      balance: (amount) => `💰 Your balance: *${amount} coins*`,
      earned: (amount) => `🪙 You earned *${amount} coins*!`,
      paid: (amount, user) => `💸 You paid *${amount} coins* to *${user}*!`,
      notEnough: "❌ *You don't have enough coins!*"
    },
    
    // Moderation
    moderation: {
      kicked: (user) => `👢 *${user} has been kicked!*`,
      banned: (user) => `🚫 *${user} has been banned!*`,
      promoted: (user) => `⬆️ *${user} has been promoted to admin!*`,
      demoted: (user) => `⬇️ *${user} has been demoted!*`,
      groupSettingsChanged: "⚙️ *Group settings updated!*"
    }
  },
  
  // Command Configurations
  commands: {
    // AI Commands
    ai: {
      enabled: true,
      cooldown: 5,
      cost: 0
    },
    
    // Downloaders
    youtube: {
      enabled: true,
      cooldown: 10,
      cost: 5
    },
    
    // Fun Commands
    sticker: {
      enabled: true,
      cooldown: 3,
      cost: 0
    },
    
    // Moderation
    kick: {
      enabled: true,
      cooldown: 0,
      adminOnly: true
    },
    
    // NSFW
    nsfw: {
      enabled: false,
      cooldown: 30,
      privateOnly: true
    }
  },
  
  // Feature Toggles
  features: {
    welcomeMessage: true,
    goodbyeMessage: true,
    antiSpam: true,
    antiBadWords: false,
    economySystem: true,
    musicPlayer: true,
    nsfwFilter: true
  },
  
  // Limits
  limits: {
    stickerSize: 1000000, // 1MB
    fileUpload: 5000000, // 5MB
    commandRate: 5, // commands per minute
    apiCalls: 30 // API calls per minute
  },
  
  // Auto-Reply Config
  autoReply: {
    enabled: true,
    responses: [
      {
        trigger: ["hi", "hello", "hey"],
        response: "👋 Hello! How can I help you today?"
      },
      {
        trigger: ["thanks", "thank you"],
        response: "😊 You're welcome!"
      },
      {
        trigger: ["bot", "are you a bot"],
        response: "🤖 Yes, I'm ZUKO-MD, your friendly WhatsApp bot!"
      }
    ]
  }
};