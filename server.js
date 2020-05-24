const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');
const bot = 'AdminBot';

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(path.join(__dirname, 'public'))));

io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        socket.emit('message', formatMessage(bot, 'Welcome to the chatroom.'));

        //broadcast to all the other clients except the one just connected
        socket.broadcast
            .to(user.room)
            .emit('message', formatMessage(bot, `${user.username} has joined the chatroom.`));

        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    });

    socket.on('chatMessage', message => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, message));
    });

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            //this will broadcast to all clients
            io.to(user.room)
                .emit('message', formatMessage(bot, `${user.username} has left the chat.`));

            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            })
        }
    });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));