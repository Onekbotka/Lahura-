const ax = require("axios");
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "balance.db"));

// balance table
db.prepare(`
CREATE TABLE IF NOT EXISTS balances (
  userID TEXT PRIMARY KEY,
  balance INTEGER
)`).run();

function getBalance(userID) {
  const row = db.prepare("SELECT balance FROM balances WHERE userID=?").get(userID);
  return row ? row.balance : 100;
}

function setBalance(userID, balance) {
  db.prepare(`
  INSERT INTO balances (userID, balance)
  VALUES (?, ?)
  ON CONFLICT(userID) DO UPDATE SET balance=excluded.balance
  `).run(userID, balance);
}

function formatBalance(num) {
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M$";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "k$";
  return num + "$";
}

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "2.0",
    author: "MOHAMMAD AKASH",
    role: 0,
    category: "economy",
    guide: "{p}quiz <bn/en>"
  },

  onStart: async function ({ api, event, usersData, args }) {
    const category =
      args[0]?.toLowerCase() === "bn" ? "bangla" :
      args[0]?.toLowerCase() === "en" ? "english" :
      Math.random() < 0.5 ? "bangla" : "english";

    try {
      const r = await ax.get(`https://nix-quizz.vercel.app/quiz?category=${category}&q=random`);
      const q = r.data.question;
      const { question, correctAnswer, options } = q;

      const msg = `
╭──✦ ${question}
├‣ 𝐀• ${options.a}
├‣ 𝐁• ${options.b}
├‣ 𝐂• ${options.c}
├‣ 𝐃• ${options.d}
╰──────────────‣
Reply: A / B / C / D`;

      api.sendMessage(msg, event.threadID, (e, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "quiz",
          author: event.senderID,
          correctAnswer,
          attempts: 0
        });
      }, event.messageID);

    } catch (e) {
      api.sendMessage("❌ Failed to fetch quiz.", event.threadID);
    }
  },

  onReply: async ({ api, event, Reply, usersData }) => {
    if (!Reply || event.senderID !== Reply.author) return;

    const max = 2;
    const answer = event.body.toLowerCase();

    if (Reply.attempts >= max) {
      await api.unsendMessage(event.messageReply.messageID).catch(() => {});
      return api.sendMessage(
        `❌ 𝐌ᴀx 𝐀ᴛᴛᴇᴍᴘᴛs 𝐑ᴇᴀᴄʜᴇᴅ.\n✅ Correct answer: ${Reply.correctAnswer}`,
        event.threadID
      );
    }

    if (answer === Reply.correctAnswer.toLowerCase()) {
      const reward = 500;
      let bal = getBalance(event.senderID);
      bal += reward;
      setBalance(event.senderID, bal);

      const name = await usersData.getName(event.senderID);

      const body =
`🎉 𝐂ᴏʀʀᴇᴄᴛ 𝐀ɴsᴡᴇʀ!
👤 ${name}
💰 𝐑ᴇᴡᴀʀᴅ: +${reward}$
🏦 𝐍ᴇᴡ 𝐁ᴀʟᴀɴᴄᴇ: ${formatBalance(bal)}`;

      const index = body.indexOf(name);

      return api.sendMessage({
        body,
        mentions: [{
          id: event.senderID,
          tag: name,
          fromIndex: index
        }]
      }, event.threadID);
    }

    Reply.attempts++;
    global.GoatBot.onReply.set(event.messageReply.messageID, Reply);

    api.sendMessage(
      `❌ 𝐖ʀᴏɴɢ 𝐀ɴsᴡᴇʀ\n𝐀ᴛᴛᴇᴍᴘᴛs 𝐋ᴇғᴛ: ${max - Reply.attempts}`,
      event.threadID
    );
  }
};
