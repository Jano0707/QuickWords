const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*"
    }
});

app.use(express.static(__dirname));

const rooms = new Map();
const categories = [
    "Tiere", "Städte", "Länder", "Essen & Trinken", "Berufe", 
    "Sportarten", "Filme & Serien", "Marken", "Musik"
];

io.on('connection', (socket) => {
    console.log('Ein Benutzer hat sich verbunden');

    // Raum erstellen
    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: [], // Array für Reihenfolge
                activePlayers: new Set(), // Set für aktive Spieler
                gameStarted: false,
                currentCategory: categories[Math.floor(Math.random() * categories.length)],
                usedLetters: new Set(),
                currentPlayerIndex: 0
            });
        }
        socket.roomId = roomId;
        socket.join(roomId);
        console.log('Room created', roomId);
        socket.emit('roomCreated');
    });

    // Raum überprüfen
    socket.on('checkRoom', (roomId) => {
        console.log('Checking room:', roomId);
        socket.emit('roomExists', rooms.has(roomId));
    });

    // Raum beitreten
    socket.on('joinRoom', (data) => {
        const { roomId, playerName } = data;
        
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            // Füge Spieler nur hinzu, wenn er noch nicht im Raum ist
            if (!room.players.find(p => p.id === socket.id)) {
                const player = {
                    id: socket.id,
                    name: playerName,
                    isActive: true
                };
                room.players.push(player);
                room.activePlayers.add(socket.id);
            }
            socket.roomId = roomId;
            socket.playerName = playerName;
            socket.join(roomId);
            
            // Sende aktuelle Spielerliste und aktiven Spieler an alle
            io.to(roomId).emit('playerJoined', {
                players: room.players,
                category: room.currentCategory,
                currentPlayer: room.players[room.currentPlayerIndex]
            });
            
            console.log('Player', playerName, 'joined room:', roomId);
        }
    });

    socket.on('startTimer', (data) => {
        const { roomId } = data;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.gameStarted = true;
            io.to(roomId).emit('timerStarted', { 
                duration: 25,
                currentPlayer: room.players[room.currentPlayerIndex]
            });
        }
    });

    socket.on('nextPlayer', (data) => {
        const { roomId } = data;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            do {
                room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
            } while (!room.activePlayers.has(room.players[room.currentPlayerIndex].id));

            io.to(roomId).emit('playerTurnChanged', {
                currentPlayer: room.players[room.currentPlayerIndex],
                players: room.players
            });

            // Starte Timer für nächsten Spieler
            io.to(roomId).emit('timerStarted', { 
                duration: 25,
                currentPlayer: room.players[room.currentPlayerIndex]
            });
        }
    });

    socket.on('playerFailed', () => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            room.activePlayers.delete(socket.id);
            
            // Markiere Spieler als inaktiv
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                player.isActive = false;
                io.to(socket.roomId).emit('playerEliminated', {
                    playerId: socket.id
                });

                // Wechsle zum nächsten aktiven Spieler
                socket.emit('nextPlayer', { roomId: socket.roomId });
            }
        }
    });

    socket.on('newCategory', (data) => {
        const { roomId } = data;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            room.currentCategory = categories[Math.floor(Math.random() * categories.length)];
            room.usedLetters.clear();
            room.currentPlayerIndex = 0;
            room.gameStarted = false;  // Setze gameStarted zurück
            
            // Reaktiviere alle Spieler
            room.players.forEach(player => {
                player.isActive = true;
                room.activePlayers.add(player.id);
            });

            io.to(roomId).emit('categoryChanged', {
                category: room.currentCategory,
                players: room.players,
                currentPlayer: room.players[room.currentPlayerIndex]
            });
        }
    });

    socket.on('letterClicked', (data) => {
        const { roomId, letter } = data;
        if (roomId && rooms.has(roomId)) {
            const room = rooms.get(roomId);
            // Nur der aktuelle Spieler darf Buchstaben klicken
            if (room.players[room.currentPlayerIndex].id === socket.id) {
                io.to(roomId).emit('letterClicked', { letter });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            room.activePlayers.delete(socket.id);
            
            // Entferne Spieler aus der Liste
            room.players = room.players.filter(p => p.id !== socket.id);
            
            if (room.players.length === 0) {
                setTimeout(() => {
                    if (rooms.has(socket.roomId) && rooms.get(socket.roomId).players.length === 0) {
                        rooms.delete(socket.roomId);
                        console.log('Room deleted after timeout:', socket.roomId);
                    }
                }, 600000);
            } else {
                // Wenn der disconnectete Spieler der aktuelle Spieler war
                if (room.players[room.currentPlayerIndex]?.id === socket.id) {
                    socket.emit('nextPlayer', { roomId: socket.roomId });
                }
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});