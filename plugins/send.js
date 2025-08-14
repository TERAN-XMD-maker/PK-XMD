const fs = require('fs');
const path = require('path');
const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

const DATA_PATH = path.resolve(__dirname, '../data/send_data.json');
if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify({ sentToday: [], dailyCount: 0, lastReset: Date.now(), reports: [] }, null, 2));
}
let store = JSON.parse(fs.readFileSync(DATA_PATH));

function saveStore() {
    fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

// Reset daily limit if new day
function resetIfNeeded() {
    const last = new Date(store.lastReset).toDateString();
    const now = new Date().toDateString();
    if (last !== now) {
        store.sentToday = [];
        store.dailyCount = 0;
        store.lastReset = Date.now();
        saveStore();
    }
}

cmd({
    pattern: "send",
    react: "📢",
    desc: "Broadcast message to multiple groups",
    category: "owner",
    use: '.send <group names> | <message>',
    filename: __filename
}, async (conn, mek, m, { args, q, isCreator, reply }) => {
    resetIfNeeded();
    if (!isCreator) return reply("🚫 Owner only.");
    if (!q.includes('|')) return reply("❗ Please provide group names and message separated by '|'.\nExample: `.send Group1,Group2 | Hello everyone!`");

    const [groupList, messageBody] = q.split('|').map(s => s.trim());
    const groupNames = groupList.split(',').map(g => g.trim());

    const greetings = ["Hey 👋", "Hi there 😊", "Hello 🙂", "Good day 🌟"];
    let totalSent = 0, totalFail = 0, startTime = Date.now();
    let stopRequested = false;

    global.broadcastStop = false; // Reset stop flag

    for (const groupName of groupNames) {
        if (store.dailyCount >= 300) {
            reply("📛 Daily limit of 300 messages reached. Try again tomorrow.");
            break;
        }
        if (global.broadcastStop) {
            reply("🛑 Broadcast stopped.");
            break;
        }

        const allGroups = await conn.groupFetchAllParticipating();
        const grp = Object.values(allGroups).find(g => g.subject.toLowerCase() === groupName.toLowerCase());
        if (!grp) continue;

        const meta = await conn.groupMetadata(grp.id);
        const members = meta.participants.map(p => p.id).filter(id => !store.sentToday.includes(id));

        for (const userId of members) {
            if (store.dailyCount >= 300) break;
            if (global.broadcastStop) break;

            // Mark typing simulation
            await conn.sendPresenceUpdate('composing', userId);
            await sleep(Math.floor(Math.random() * 2000) + 2000);

            // Personalize message
            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            const text = `${greeting}\n${messageBody}`;

            try {
                await conn.sendMessage(userId, { text });
                store.sentToday.push(userId);
                store.dailyCount++;
                totalSent++;
            } catch {
                totalFail++;
            }

            saveStore();
            await reply(`Progress: ${totalSent} sent, ${totalFail} failed, ${store.dailyCount}/300 today`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    reply(`✅ Broadcast complete!\n🕒 Time: ${elapsed}s\n📤 Sent: ${totalSent}\n❌ Failed: ${totalFail}`);
});
