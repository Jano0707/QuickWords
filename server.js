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

// Room-Management und Userverwaltung

// Map zur Speicherung der Räume und deren Spieler
const rooms = new Map();

// Funktion zur Generierung einer einzigartigen Room ID
function generateUniqueRoomId() {
    let roomId;
    do {
      roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-stellige zufällige ID
    } while (rooms.has(roomId)); // Wiederholen, falls die ID schon existiert
    return roomId;
}

// Socket.IO-Logik für den Umgang mit Spielern und Räumen
io.on("connection", (socket) => {
    console.log("Ein Benutzer ist verbunden:", socket.id);
  
    // Neues Spiel erstellen
    socket.on("createRoom", (username) => {
        const roomId = generateUniqueRoomId();
        rooms.set(roomId, { users: [{ id: socket.id, username }] });
        socket.join(roomId);
        socket.emit("roomCreated", roomId); // Room ID an den Ersteller senden
        console.log(`Raum ${roomId} wurde erstellt von ${username}`);
    });

    // Einem existierenden Raum beitreten
    socket.on("joinRoom", ({ roomId, username }) => {
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.users.push({ id: socket.id, username });
            socket.join(roomId);
            io.to(roomId).emit("userJoined", { username, roomId });
            console.log(`${username} ist Raum ${roomId} beigetreten`);
        } else {
            socket.emit("error", "Ungültige Room ID");
        }
    });

    // Benutzer-Disconnect behandeln
    /*
    socket.on("disconnect", () => {
        for (const [roomId, room] of rooms) {
        const userIndex = room.users.findIndex((user) => user.id === socket.id);
        if (userIndex !== -1) {
            const [user] = room.users.splice(userIndex, 1);
            console.log(`${user.username} hat Raum ${roomId} verlassen`);
            if (room.users.length === 0) {
                rooms.delete(roomId); // Raum löschen, wenn er leer ist
                console.log(`Raum ${roomId} wurde gelöscht`);
            }
            break;
        }
        }
    });
    */
});

// Server starten
server.listen(3000, () => {
    console.log("Server läuft auf http://localhost:3000");
});