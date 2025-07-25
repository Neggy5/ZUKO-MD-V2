const settings = require('../settings');

class GroupCreator {
    constructor() {
        this.maxParticipants = 50; // WhatsApp's max group size
        this.minParticipants = 1;
    }

    async createGroup({ sock, chatId, message, rawText }) {
        try {
            // Parse command arguments
            const { groupName, description, participants, error } = this.parseCommand(rawText);
            if (error) {
                return this.showUsage(sock, chatId, message);
            }

            // Validate participants
            const validation = this.validateParticipants(participants);
            if (!validation.valid) {
                return sock.sendMessage(chatId, {
                    text: `❌ ${validation.message}`,
                    quoted: message
                });
            }

            // Show processing message
            const processingMsg = await sock.sendMessage(chatId, {
                text: `⏳ Creating *${groupName}* with ${participants.length} members...`,
                quoted: message
            });

            // Create group
            const group = await sock.groupCreate(groupName, participants);
            
            // Set group description
            await this.setGroupDescription(sock, group.gid, description, groupName);

            // Send success message to new group
            await this.sendSuccessMessage(sock, group.gid, groupName, description, participants);

            // Clean up processing message
            await sock.sendMessage(chatId, {
                delete: processingMsg.key
            });

            return { success: true, groupId: group.gid };

        } catch (error) {
            console.error('Group creation error:', error);
            await this.handleError(sock, chatId, message, error);
            return { success: false, error: error.message };
        }
    }

    parseCommand(rawText) {
        const args = rawText.split('.creategroup')[1]?.trim().split('|').map(arg => arg.trim());
        
        if (!args || args.length < 2) {
            return { error: true };
        }

        const [groupName, description, ...memberTags] = args;
        const participants = memberTags
            .join(' ')
            .split('@')
            .filter(Boolean)
            .map(num => num.trim() + '@s.whatsapp.net');

        return { groupName, description, participants };
    }

    validateParticipants(participants) {
        if (participants.length < this.minParticipants) {
            return { valid: false, message: `You must add at least ${this.minParticipants} participant!` };
        }

        if (participants.length > this.maxParticipants) {
            return { valid: false, message: `Maximum ${this.maxParticipants} participants allowed!` };
        }

        // Check for duplicate participants
        const uniqueParticipants = new Set(participants);
        if (uniqueParticipants.size !== participants.length) {
            return { valid: false, message: 'Duplicate participants detected!' };
        }

        return { valid: true };
    }

    async setGroupDescription(sock, groupId, description, groupName) {
        try {
            const desc = description || `${groupName} - Created by ZUKO-MD`;
            await sock.groupUpdateDescription(groupId, desc);
        } catch (error) {
            console.error('Failed to set group description:', error);
        }
    }

    async sendSuccessMessage(sock, groupId, groupName, description, participants) {
        const messageText = [
            `🎉 *Group Created Successfully!*`,
            ``,
            `*Name:* ${groupName}`,
            `*Description:* ${description || "None"}`,
            `*Members:* ${participants.length + 1}`,
            ``,
            `_Powered by 𝐙𝐔𝐊𝐎-𝐌𝐃 v${settings.version}_`
        ].join('\n');

        await sock.sendMessage(groupId, {
            text: messageText,
            contextInfo: this.getContextInfo()
        });
    }

    showUsage(sock, chatId, message) {
        const usageText = [
            `👥 *Group Creation Command*`,
            ``,
            `Usage:`,
            `.creategroup Group Name|description|@member1 @member2`,
            ``,
            `Example:`,
            `.creategroup ZUKO Squad|Official group|@1234 @5678`,
            ``,
            `Note: Maximum ${this.maxParticipants} participants allowed.`
        ].join('\n');

        return sock.sendMessage(chatId, {
            text: usageText,
            quoted: message,
            contextInfo: this.getContextInfo()
        });
    }

    async handleError(sock, chatId, message, error) {
        let errorMessage = `⚠️ Failed to create group!`;
        
        if (error.message.includes('401')) {
            errorMessage += `\n\n*Reason:* Invalid participant(s) detected`;
        } else if (error.message.includes('409')) {
            errorMessage += `\n\n*Reason:* Duplicate participants found`;
        } else {
            errorMessage += `\n\n*Reason:* ${error.message}`;
        }

        await sock.sendMessage(chatId, {
            text: errorMessage,
            quoted: message
        });
    }

    getContextInfo() {
        return {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363401680775438@newsletter',
                newsletterName: '𝐙𝐔𝐊𝐎-𝐌𝐃',
                serverMessageId: -1
            }
        };
    }
}

module.exports = new GroupCreator();