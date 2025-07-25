const fs = require('fs');
const path = require('path');
const { jidDecode } = require('@whiskeysockets/baileys');

class MessageStore {
    constructor() {
        this.messages = {};
        this.contacts = {};
        this.chats = {};
    }

    // Load a message from store
    async loadMessage(jid, id) {
        return this.messages[jid]?.[id] || null;
    }

    // Get group metadata (simplified version)
    async groupMetadata(jid) {
        // In a real implementation, you might want to cache this
        // or fetch from the database
        return {
            id: jid,
            subject: '',
            creation: 0,
            owner: '',
            participants: []
        };
    }

    // Bind event handlers to the socket
    bind(eventEmitter) {
        eventEmitter.on('messages.upsert', ({ messages }) => {
            this.handleNewMessages(messages);
        });

        eventEmitter.on('contacts.update', (contacts) => {
            this.updateContacts(contacts);
        });

        eventEmitter.on('chats.set', (chats) => {
            this.setChats(chats);
        });
    }

    // Handle incoming messages
    handleNewMessages(messages) {
        messages.forEach(msg => {
            if (msg.key && msg.key.remoteJid && msg.key.id) {
                const jid = this.normalizeJid(msg.key.remoteJid);
                this.messages[jid] = this.messages[jid] || {};
                this.messages[jid][msg.key.id] = msg;
            }
        });
    }

    // Update contacts in store
    updateContacts(contacts) {
        contacts.forEach(contact => {
            if (contact.id) {
                const jid = this.normalizeJid(contact.id);
                this.contacts[jid] = {
                    ...(this.contacts[jid] || {}),
                    ...contact
                };
            }
        });
    }

    // Set all chats
    setChats(chats) {
        this.chats = chats.reduce((acc, chat) => {
            if (chat.id) {
                const jid = this.normalizeJid(chat.id);
                acc[jid] = chat;
            }
            return acc;
        }, {});
    }

    // Normalize JID format
    normalizeJid(jid) {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decoded = jidDecode(jid) || {};
            return decoded.user && decoded.server ? 
                `${decoded.user}@${decoded.server}` : jid;
        }
        return jid;
    }

    // Save store to disk (optional)
    async saveToDisk() {
        try {
            const data = {
                messages: this.messages,
                contacts: this.contacts,
                chats: this.chats,
                timestamp: Date.now()
            };
            await fs.promises.writeFile(
                path.join(__dirname, '../data/store.json'),
                JSON.stringify(data, null, 2)
            );
        } catch (error) {
            console.error('Failed to save store:', error);
        }
    }

    // Load store from disk (optional)
    async loadFromDisk() {
        try {
            const filePath = path.join(__dirname, '../data/store.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(await fs.promises.readFile(filePath));
                this.messages = data.messages || {};
                this.contacts = data.contacts || {};
                this.chats = data.chats || {};
            }
        } catch (error) {
            console.error('Failed to load store:', error);
        }
    }
}

// Create singleton instance
const store = new MessageStore();

// Optional: Load previous state if available
if (process.env.PERSIST_STORE === 'true') {
    store.loadFromDisk().catch(console.error);

    // Auto-save periodically
    setInterval(() => {
        store.saveToDisk().catch(console.error);
    }, 300000); // Every 5 minutes
}

module.exports = store;