const express = require("express");
const path = require("path");
const app = express();

// socket.io Setup
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

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
        rooms.set(roomId, {
            users: [{ id: socket.id, username }],
            turnIndex: 0 // Der erste Spieler wird initial festgelegt
        });
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

    /** 
     * NUN GEHTS AN DIE GAME LOGIK
    */

    // Funktion für die Zugübergabe
    socket.on("endTurn", (roomId) => {
        const room = rooms.get(roomId);
        if (room) {
            // Update turnIndex für den nächsten Spieler
            room.turnIndex = (room.turnIndex + 1) % room.users.length;
            const currentPlayer = room.users[room.turnIndex];
            
            // Benachrichtigen, dass der nächste Spieler an der Reihe ist
            io.to(currentPlayer.id).emit("yourTurn", { username: currentPlayer.username });
            // weiß ich nicht, ob nötig io.to(roomId).emit("turnChanged", { currentPlayer: currentPlayer.username });
        }
    });

    // Main Button Event
    socket.on("mainButtonPressed", (roomId) => {
        io.to(roomId).emit("mainButtonUpdate");
    });

    // Buchstaben-Klick Event
    socket.on("letterClicked", ({ roomId, letter }) => {
        io.to(roomId).emit("letterUpdate", letter);
    });

    // Texteingabe Event
    socket.on("textInput", ({ roomId, text }) => {
        io.to(roomId).emit("textUpdate", text);
    });

    // Benutzer-Disconnect behandeln
    // Spieler verlassen den Raum
    socket.on("disconnect", (reason) => {
        rooms.forEach((room, roomId) => {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                const [removedUser] = room.users.splice(userIndex, 1);
                console.log(`${removedUser.username} hat Raum ${roomId} verlassen`);
                
                // Aktualisiere den turnIndex, falls nötig
                if (room.turnIndex >= room.users.length) {
                    room.turnIndex = 0;
                }

                if (room.users.length === 0) {
                    rooms.delete(roomId); // Raum entfernen, wenn keine Benutzer mehr übrig sind
                    console.log('Der Raum ${roomId} ist leer und wurde gelöscht')
                } else {
                    io.to(roomId).emit("userLeft", removedUser.username);
                }
            }
        });
    });
    /*
    // Benutzer-Disconnect-Logik
    socket.on("disconnect", () => {
        console.log(`Benutzer ${socket.id} hat die Verbindung getrennt.`);
        for (const [roomId, room] of rooms.entries()) {
            if (room.users.some(user => user.id === socket.id)) {
                socket.emit("leaveRoom", roomId);
            }
        }
        delete users[socket.id];
    });
    */
});