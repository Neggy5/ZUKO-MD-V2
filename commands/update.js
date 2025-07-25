const { exec } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: "update",
    alias: ["upgrade", "gitpull"],
    desc: "Update the bot dependencies and system",
    category: "Dev",
    react: "🔄",
    start: async (Zuko, m, { text, prefix }) => {
        // Only allow bot owner to use this command
        if (m.sender !== settings.ownership.mainOwner.jid) {
            return Zuko.sendMessage(m.from, { text: "❌ This command can only be used by the bot owner!" }, { quoted: m });
        }

        try {
            await Zuko.sendMessage(m.from, { text: "🔄 *Updating ZUKO-MD...* This may take a moment..." }, { quoted: m });

            // 1. Git Pull (Update bot code)
            const gitPull = () => new Promise((resolve, reject) => {
                exec('git pull', (error, stdout, stderr) => {
                    if (error) return reject(error);
                    resolve(stdout ? stdout : stderr);
                });
            });

            // 2. NPM Install (Update dependencies)
            const npmInstall = () => new Promise((resolve, reject) => {
                exec('npm install --legacy-peer-deps', (error, stdout, stderr) => {
                    if (error) return reject(error);
                    resolve(stdout ? stdout : stderr);
                });
            });

            // 3. Check for package.json changes
            const checkPackageChanges = () => new Promise((resolve) => {
                exec('git diff --name-only HEAD@{1} HEAD -- package.json', (error, stdout) => {
                    resolve(stdout.includes('package.json'));
                });
            });

            // Run updates
            const gitResult = await gitPull();
            const packageChanged = await checkPackageChanges();
            
            let npmResult = "";
            if (packageChanged) {
                npmResult = await npmInstall();
            }

            // Prepare update report
            const updateReport = `
✅ *Update Complete*

📥 *Git Changes:*
${gitResult}

${packageChanged ? `📦 *Dependency Updates:*\n${npmResult}` : '📦 No dependency updates needed'}

♻️ *Restarting bot...*
            `;

            await Zuko.sendMessage(m.from, { text: updateReport }, { quoted: m });

            // Restart the bot
            setTimeout(() => {
                process.exit(1);
            }, 3000);

        } catch (error) {
            console.error(chalk.red('Update error:'), error);
            await Zuko.sendMessage(
                m.from,
                { 
                    text: `❌ *Update Failed!*\n\nError:\n${error.message}\n\nCheck logs for details.`
                },
                { quoted: m }
            );
        }
    }
};