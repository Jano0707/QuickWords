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
    "Tiere", "Länder", "Städte", "Namen", "Essen & Trinken", "Berufe"
];

io.on('connection', (socket) => {
    console.log('Ein Benutzer hat sich verbunden');

    // Raum erstellen
    socket.on('createRoom', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, {
                players: new Set([socket.id]),
                gameStarted: false,
                currentCategory: categories[Math.floor(Math.random() * categories.length)],
                usedLetters: new Set()
            });
        }
        socket.roomId = roomId;
        socket.join(roomId);
        console.log('Room created/joined:', roomId);
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
            room.players.add(socket.id);
            socket.roomId = roomId;
            socket.playerName = playerName;
            socket.join(roomId);
            
            socket.emit('playerJoined', {
                category: room.currentCategory
            });
            
            console.log('Player', playerName, 'joined room:', roomId);
        } else {
            // Wenn der Raum nicht existiert, erstelle ihn
            console.log('Room not found, creating new room:', roomId);
            rooms.set(roomId, {
                players: new Set([socket.id]),
                gameStarted: false,
                currentCategory: categories[Math.floor(Math.random() * categories.length)],
                usedLetters: new Set()
            });
            socket.roomId = roomId;
            socket.playerName = playerName;
            socket.join(roomId);
            socket.emit('playerJoined', {
                category: rooms.get(roomId).currentCategory
            });
        }
    });

    socket.on('startTimer', (data) => {
        const { roomId } = data;
        console.log('Timer start requested for room:', roomId);
        if (roomId && rooms.has(roomId)) {
            console.log('Starting timer for room:', roomId);
            const room = rooms.get(roomId);
            room.gameStarted = true;
            io.to(roomId).emit('timerStarted', { 
                duration: 25
            });
        } else {
            console.log('Room not found:', roomId);
        }
    });

    socket.on('submitWord', (data) => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            const { word, letter } = data;
            
            if (word.toLowerCase().startsWith(letter.toLowerCase())) {
                room.usedLetters.add(letter.toLowerCase());
                io.to(socket.roomId).emit('wordAccepted', {
                    playerId: socket.id,
                    letter: letter,
                    word: word
                });
            }
        }
    });

    socket.on('playerFailed', () => {
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            const player = room.players.has(socket.id);
            if (player) {
                room.players.delete(socket.id);
                io.to(socket.roomId).emit('playerEliminated', {
                    playerId: socket.id
                });
            }
        }
    });

    socket.on('newCategory', (data) => {
        const { roomId } = data;
        console.log('New category requested for room:', roomId);
        if (roomId && rooms.has(roomId)) {
            console.log('Changing category for room:', roomId);
            const room = rooms.get(roomId);
            room.currentCategory = categories[Math.floor(Math.random() * categories.length)];
            room.usedLetters.clear();
            io.to(roomId).emit('categoryChanged', {
                category: room.currentCategory
            });
        } else {
            console.log('Room not found:', roomId);
        }
    });

    socket.on('letterClicked', (data) => {
        const { roomId, letter } = data;
        console.log('Letter clicked in room:', roomId, 'letter:', letter);
        if (roomId && rooms.has(roomId)) {
            socket.to(roomId).emit('letterClicked', { letter });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected, keeping room data');
        // Raum und Spielerdaten bleiben erhalten
        if (socket.roomId && rooms.has(socket.roomId)) {
            const room = rooms.get(socket.roomId);
            room.players.delete(socket.id);
            // Raum wird nur gelöscht, wenn er länger als 1 Stunde leer ist
            if (room.players.size === 0) {
                setTimeout(() => {
                    if (rooms.has(socket.roomId) && rooms.get(socket.roomId).players.size === 0) {
                        rooms.delete(socket.roomId);
                        console.log('Room deleted after timeout:', socket.roomId);
                    }
                }, 600000); // 1 Stunde
            }
        }
    });
});

const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});