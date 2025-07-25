class MessageUtils {
    static getQuotedMessageInfo(message) {
        const context = message.message?.extendedTextMessage?.contextInfo;
        if (!context) return null;
        
        return {
            stanzaId: context.stanzaId,
            participant: context.participant,
            remoteJid: context.remoteJid || message.key.remoteJid
        };
    }

    static async validateAdminPrivileges(sock, chatId, senderId) {
        const { isSenderAdmin, isBotAdmin } = await require('./isAdmin')(sock, chatId, senderId);
        
        if (!isBotAdmin) {
            throw new Error('BOT_NOT_ADMIN');
        }
        
        if (!isSenderAdmin) {
            throw new Error('USER_NOT_ADMIN');
        }
        
        return true;
    }
}

module.exports = MessageUtils;