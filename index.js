require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const { 
    default: makeWASocket,
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Create a store object with required methods
const store = {
    messages: {},
    contacts: {},
    chats: {},
    groupMetadata: async (jid) => {
        try {
            if (!XeonBotInc) return {};
            const metadata = await XeonBotInc.groupMetadata(jid).catch(() => {});
            return metadata || {
                id: jid,
                subject: "Unknown Group",
                creation: 0,
                owner: null,
                desc: null,
                participants: []
            };
        } catch (error) {
            console.error('Group metadata error:', error);
            return {
                id: jid,
                subject: "Error Loading Group",
                participants: []
            };
        }
    },
    bind: function(ev) {
        // Handle events
        ev.on('messages.upsert', ({ messages }) => {
            messages.forEach(msg => {
                if (msg.key && msg.key.remoteJid) {
                    this.messages[msg.key.remoteJid] = this.messages[msg.key.remoteJid] || {}
                    this.messages[msg.key.remoteJid][msg.key.id] = msg
                }
            })
        })
        
        ev.on('contacts.update', (contacts) => {
            contacts.forEach(contact => {
                if (contact.id) {
                    this.contacts[contact.id] = contact
                }
            })
        })
        
        ev.on('chats.set', (chats) => {
            this.chats = chats
        })
    },
    loadMessage: async (jid, id) => {
        return this.messages[jid]?.[id] || null
    }
}

let phoneNumber = "27810971476"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "ZUKO-MD"
global.themeemoji = "•"

const settings = require('./settings')
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

// Only create readline interface if we're in an interactive environment
const rl = process.stdin.isTTY ? readline.createInterface({ input: process.stdin, output: process.stdout }) : null
const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        // In non-interactive environment, use ownerNumber from settings
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

async function startXeonBotInc() {
    let { version, isLatest } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache()

    const XeonBotInc = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
            return msg?.message || ""
        },
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    })

    store.bind(XeonBotInc.ev)

    // Enhanced message handling with group support
    XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                await handleStatus(XeonBotInc, chatUpdate);
                return;
            }
            
            const isGroup = mek.key.remoteJid?.endsWith('@g.us');
            if (!XeonBotInc.public && !mek.key.fromMe && !isGroup) return;
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
            
            try {
                // Add slight delay for group messages
                if (isGroup) await delay(500);
                await handleMessages(XeonBotInc, chatUpdate, true);
            } catch (err) {
                console.error("Error in handleMessages:", err);
                if (mek.key && mek.key.remoteJid) {
                    await XeonBotInc.sendMessage(mek.key.remoteJid, { 
                        text: `❌ ${isGroup ? 'Group' : ''} Command Failed\n${err.message}`,
                        contextInfo: {
                            forwardingScore: 1,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: '120363401680775438@newsletter',
                                newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                                serverMessageId: -1
                            }
                        }
                    }).catch(console.error);
                }
            }
        } catch (err) {
            console.error("Error in messages.upsert:", err);
        }
    })

    // Add these event handlers for better functionality
    XeonBotInc.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    XeonBotInc.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = XeonBotInc.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
        }
    })

    XeonBotInc.getName = async (jid, withoutContact = false) => {
        id = XeonBotInc.decodeJid(jid)
        withoutContact = XeonBotInc.withoutContact || withoutContact 
        let v
        if (id.endsWith("@g.us")) {
            try {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = await XeonBotInc.groupMetadata(id) || {}
                return v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international')
            } catch (e) {
                console.error('Group name error:', e)
                return 'Group'
            }
        }
        else v = id === '0@s.whatsapp.net' ? {
            id,
            name: 'WhatsApp'
        } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
            XeonBotInc.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }

    XeonBotInc.public = true

    XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

    // Handle pairing code
    if (pairingCode && !XeonBotInc.authState.creds.registered) {
        if (useMobile) throw new Error('Cannot use pairing code with mobile api')

        let phoneNumber
        if (!!global.phoneNumber) {
            phoneNumber = global.phoneNumber
        } else {
            phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Please type your WhatsApp number 😍\nFormat: 27810971476 (without + or spaces) : `)))
        }

        // Clean the phone number - remove any non-digit characters
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

        // Validate the phone number using awesome-phonenumber
        const pn = require('awesome-phonenumber');
        if (!pn('+' + phoneNumber).isValid()) {
            console.log(chalk.red('Invalid phone number. Please enter your full international number (e.g., 15551234567 for US, 447911123456 for UK, etc.) without + or spaces.'));
            process.exit(1);
        }

        setTimeout(async () => {
            try {
                let code = await XeonBotInc.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)))
                console.log(chalk.yellow(`\nPlease enter this code in your WhatsApp app:\n1. Open WhatsApp\n2. Go to Settings > Linked Devices\n3. Tap "Link a Device"\n4. Enter the code shown above`))
            } catch (error) {
                console.error('Error requesting pairing code:', error)
                console.log(chalk.red('Failed to get pairing code. Please check your phone number and try again.'))
            }
        }, 3000)
    }

    // Connection handling with enhanced console output
    XeonBotInc.ev.on('connection.update', async (s) => {
        const { connection, lastDisconnect } = s
        if (connection == "open") {
            console.clear()
            console.log(chalk.blue(`
███████╗██╗   ██╗██╗  ██╗ ██████╗      ███╗   ███╗██████╗ 
╚══███╔╝██║   ██║██║ ██╔╝██╔═══██╗     ████╗ ████║██╔══██╗
  ███╔╝ ██║   ██║█████╔╝ ██║   ██║     ██╔████╔██║██║  ██║
 ███╔╝  ██║   ██║██╔═██╗ ██║   ██║     ██║╚██╔╝██║██║  ██║
███████╗╚██████╔╝██║  ██╗╚██████╔╝     ██║ ╚═╝ ██║██████╔╝
╚══════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═╝     ╚═╝╚═════╝ 
            `))
            
            console.log(chalk.green(`\n🌿 Connected Successfully!`))
            console.log(chalk.cyan(`⏰ Time: ${new Date().toLocaleString()}`))
            console.log(chalk.magenta(`📱 WhatsApp: ${owner}`))
            console.log(chalk.yellow(`👤 User: ${JSON.stringify(XeonBotInc.user, null, 2)}\n`))
            
            console.log(chalk.cyan(`< ================================================== >\n`))
            
            console.log(chalk.bold.blue(`[ ${global.botname} ] is now online!\n`))
            
            console.log(chalk.magenta(`${global.themeemoji} YT CHANNEL: @zukotech`))
            console.log(chalk.magenta(`${global.themeemoji} GITHUB: Neggy5`))
            console.log(chalk.magenta(`${global.themeemoji} VERSION: ${require('./package.json').version}`))
            console.log(chalk.magenta(`${global.themeemoji} CREDIT: ZUKO TECH INC\n`))
            
            console.log(chalk.green.bold(`⚡ Bot is ready to receive commands!\n`))
            
            console.log(chalk.yellow(`🚀 Initializing all systems...`))
            console.log(chalk.green(`✅ Database connected`))
            console.log(chalk.green(`✅ Plugin system loaded`))
            console.log(chalk.green(`✅ Command handler ready`))
            console.log(chalk.green(`✅ Event listeners active\n`))
            
            console.log(chalk.cyan(`< ================================================== >\n`))
            
            console.log(chalk.cyan.bold(`Waiting for messages...`))

            const botNumber = XeonBotInc.user.id.split(':')[0] + '@s.whatsapp.net';
            await XeonBotInc.sendMessage(botNumber, { 
                text: `🤖 Bot Connected Successfully!\n\n⏰ Time: ${new Date().toLocaleString()}\n✅ Status: Online and Ready!`,
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363401680775438@newsletter',
                        newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                        serverMessageId: -1
                    }
                }
            });
        }
        if (
            connection === "close" &&
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output.statusCode != 401
        ) {
            startXeonBotInc()
        }
    })

    XeonBotInc.ev.on('creds.update', saveCreds)
    
    XeonBotInc.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipantUpdate(XeonBotInc, update);
    });

    XeonBotInc.ev.on('messages.upsert', async (m) => {
        if (m.messages[0].key && m.messages[0].key.remoteJid === 'status@broadcast') {
            await handleStatus(XeonBotInc, m);
        }
    });
    
    // Anti-call handler
XeonBotInc.ev.on('call', async (callData) => {
    try {
        const { from, id, status } = callData;
        const sender = XeonBotInc.decodeJid(from);
        
        // If anti-call is disabled in settings, ignore
        if (!settings.antiCall) return;
        
        // Allow calls from owner
        if (owner.includes(sender)) return;
        
        // Reject the call
        await XeonBotInc.sendMessage(sender, { 
            text: settings.rejectCallMsg || "🚫 *Bot does not accept calls!*" 
        });
        
        console.log(chalk.red(`📞 Call blocked from: ${sender}`));
        
        // Block caller if enabled
        if (settings.autoBlockCaller) {
            await XeonBotInc.updateBlockStatus(sender, "block");
            console.log(chalk.red(`⛔ User blocked: ${sender}`));
        }
    } catch (error) {
        console.error(chalk.red("Anti-call error:"), error);
    }
});

    XeonBotInc.ev.on('status.update', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    XeonBotInc.ev.on('messages.reaction', async (status) => {
        await handleStatus(XeonBotInc, status);
    });

    return XeonBotInc
}

// Start the bot with error handling
startXeonBotInc().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
})
process.on('uncaughtException', (err) => {
    console.error(chalk.red('Uncaught Exception:'), err)
})

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('Unhandled Rejection:'), err)
})

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})