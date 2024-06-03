const express = require('express');
const Filter = require('bad-words')
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
app.use(cors());
const { generateMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')


const server = http.createServer(app);
const io = new Server(server, {
  cors: {origin:"http://localhost:3000", methods: ["GET", "POST"]},
});

io.on("connection", (socket) => {
  console.log(`a user connected ${socket.id}`);
  
  socket.on('join', (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options })

    if (error) {
      return callback(error)
    }

    socket.join(user.room)

    io.to(user.room).emit('message', generateMessage('Admin', 'Welcome!'))
    //socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
    io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
    })

    callback()
  })


  socket.on('sendMessage', (message) => {
    const user = getUser(socket.id)
    const filter = new Filter()

    if (filter.isProfane(message)) {
        return callback('Profanity is not allowed!')
    }

    io.to(user.room).emit('message', generateMessage(user.username, message))
  })

  socket.on('disconnect', () => {
    const user = removeUser(socket.id)

    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }
  })

  socket.on("send_message", (data) => {
    io.emit("receive_message", data);
  });
});

server.listen(4000, () => { console.log("listening on *:4000"); });