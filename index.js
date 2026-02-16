const { spawn } = require("child_process");
const express = require("express");
const app = express();

// ====== START BOT PROCESS ======
function startProject() {
  const child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.log("Restarting Project...");
      startProject();
    }
  });
}

startProject();

// ====== UPTIME SERVER (REQUIRED FOR RAILWAY) ======
app.get("/", (req, res) => {
  res.send("Bot is running successfully 🚀");
});

// IMPORTANT: Railway uses dynamic PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Uptime server running on port " + PORT);
});
