const { cmd } = require('../command');

cmd({
    pattern: "stop",
    react: "🛑",
    desc: "Stop an ongoing broadcast",
    category: "owner",
    filename: __filename
}, async (conn, mek, m, { isCreator, reply }) => {
    if (!isCreator) return reply("🚫 Owner only.");
    global.broadcastStop = true;
    reply("🛑 Broadcast stop requested. It will halt after the current message.");
});
