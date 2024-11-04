const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Statische Dateien bereitstellen
app.use(express.static(path.resolve(__dirname)));

// Root-Route für index.html
app.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, "index.html"));
})



// Server starten
server.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});