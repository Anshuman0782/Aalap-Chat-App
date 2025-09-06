// // sockets/tictactoe.js
// // TicTacToe namespace: quick match, private rooms, rematch (accept/decline)

// function makeRoomCode(existingCodesSet) {
//   const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // easier to read
//   let code;
//   do {
//     code = Array.from({ length: 6 })
//       .map(() => chars[Math.floor(Math.random() * chars.length)])
//       .join("");
//   } while (existingCodesSet.has(code));
//   return code;
// }

// export default function registerTicTacToe(io) {
//   const nsp = io.of("/tictactoe");

//   // users: socketId -> { socket, online, playing, playerName, roomCode }
//   const users = {};

//   // rooms: roomCode -> { code, player1Id, player2Id, rematchRequesterId }
//   const rooms = new Map();

//   // quick match queue (socket ids)
//   const quickQueue = [];

//   function findAvailableOpponent(excludeSocketId) {
//     for (const id in users) {
//       const u = users[id];
//       if (!u) continue;
//       if (u.online && !u.playing && id !== excludeSocketId) return id;
//     }
//     return null;
//   }

//   function getOpponentIdInRoom(room, socketId) {
//     if (!room) return null;
//     if (room.player1Id === socketId) return room.player2Id;
//     if (room.player2Id === socketId) return room.player1Id;
//     return null;
//   }

//   function startMatch(roomCode) {
//     const room = rooms.get(roomCode);
//     if (!room || !room.player1Id || !room.player2Id) return;

//     const p1 = users[room.player1Id];
//     const p2 = users[room.player2Id];
//     if (!p1 || !p2) return;

//     p1.playing = true;
//     p2.playing = true;
//     room.rematchRequesterId = null;

//     // Assign playingAs: player1 -> circle, player2 -> cross
//     try {
//       p1.socket.emit("OpponentFound", {
//         opponentName: p2.playerName || "Player",
//         playingAs: "circle",
//       });
//       p2.socket.emit("OpponentFound", {
//         opponentName: p1.playerName || "Player",
//         playingAs: "cross",
//       });
//     } catch (err) {
//       // socket might be disconnected
//     }
//   }

//   function cleanupRoomIfEmpty(code) {
//     const room = rooms.get(code);
//     if (!room) return;
//     if (!room.player1Id && !room.player2Id) {
//       rooms.delete(code);
//     }
//   }

//   function leaveRoom(socketId) {
//     const user = users[socketId];
//     if (!user || !user.roomCode) return;
//     const code = user.roomCode;
//     const room = rooms.get(code);
//     if (!room) {
//       user.roomCode = null;
//       return;
//     }

//     // remove this user from room
//     if (room.player1Id === socketId) room.player1Id = null;
//     if (room.player2Id === socketId) room.player2Id = null;

//     // notify opponent if present
//     const opponentId = getOpponentIdInRoom(room, socketId);
//     if (opponentId && users[opponentId]) {
//       const opp = users[opponentId];
//       opp.playing = false;
//       opp.roomCode = null;
//       try {
//         opp.socket.emit("opponentLeftMatch");
//       } catch (err) {}
//     }

//     cleanupRoomIfEmpty(code);
//     user.roomCode = null;
//     user.playing = false;
//     user.playerName = user.playerName || null;
//   }

//   nsp.on("connection", (socket) => {
//     users[socket.id] = {
//       socket,
//       online: true,
//       playing: false,
//       playerName: null,
//       roomCode: null,
//     };

//     // QUICK MATCH
//     socket.on("request_to_play", (data) => {
//       const currentUser = users[socket.id];
//       if (!currentUser) return;
//       currentUser.playerName = data?.playerName || "Player";

//       const opponentId = findAvailableOpponent(socket.id);
//       if (opponentId) {
//         // create a private room for the two players
//         const existingCodes = new Set([...rooms.keys()]);
//         const code = makeRoomCode(existingCodes);
//         const room = {
//           code,
//           player1Id: opponentId,
//           player2Id: socket.id,
//           rematchRequesterId: null,
//         };
//         rooms.set(code, room);
//         users[opponentId].roomCode = code;
//         currentUser.roomCode = code;

//         // mark both playing & notify
//         startMatch(code);
//       } else {
//         // put in queue
//         if (!quickQueue.includes(socket.id)) quickQueue.push(socket.id);
//         socket.emit("OpponentNotFound");
//       }
//     });

//     // CREATE PRIVATE ROOM
//     socket.on("createRoom", (data) => {
//       const currentUser = users[socket.id];
//       if (!currentUser) return;
//       currentUser.playerName = data?.playerName || "Player";

//       // leave any previous room
//       leaveRoom(socket.id);

//       const existingCodes = new Set([...rooms.keys()]);
//       const code = makeRoomCode(existingCodes);
//       const room = {
//         code,
//         player1Id: socket.id,
//         player2Id: null,
//         rematchRequesterId: null,
//       };
//       rooms.set(code, room);
//       currentUser.roomCode = code;

//       socket.emit("roomCreated", { code });
//     });

//     // JOIN PRIVATE ROOM
//     socket.on("joinRoom", (data) => {
//       const currentUser = users[socket.id];
//       if (!currentUser) return;
//       currentUser.playerName = data?.playerName || "Player";

//       const raw = (data?.code || "").toString().trim().toUpperCase();
//       if (!raw) {
//         socket.emit("roomJoinError", { message: "Invalid room code." });
//         return;
//       }

//       const room = rooms.get(raw);
//       if (!room) {
//         socket.emit("roomJoinError", { message: "Room not found." });
//         return;
//       }

//       if (room.player1Id && room.player2Id) {
//         socket.emit("roomJoinError", { message: "Room is full." });
//         return;
//       }

//       // leave prior room (if any)
//       leaveRoom(socket.id);

//       if (!room.player1Id) {
//         room.player1Id = socket.id;
//       } else if (!room.player2Id) {
//         room.player2Id = socket.id;
//       }

//       currentUser.roomCode = raw;

//       if (room.player1Id && room.player2Id) {
//         startMatch(raw);
//       } else {
//         socket.emit("roomJoinedWaiting", { code: raw });
//       }
//     });

//     // Relay moves to opponent
//     socket.on("playerMoveFromClient", (data) => {
//       const user = users[socket.id];
//       if (!user || !user.roomCode) return;
//       const room = rooms.get(user.roomCode);
//       if (!room) return;
//       const otherId = getOpponentIdInRoom(room, socket.id);
//       if (!otherId) return;
//       const other = users[otherId];
//       if (!other) return;
//       try {
//         other.socket.emit("playerMoveFromServer", { ...data });
//       } catch (err) {}
//     });

//     // PLAY AGAIN request from a player
//     socket.on("playAgainRequest", () => {
//       const user = users[socket.id];
//       if (!user || !user.roomCode) return;
//       const room = rooms.get(user.roomCode);
//       if (!room) return;

//       const otherId = getOpponentIdInRoom(room, socket.id);
//       if (!otherId || !users[otherId]) {
//         socket.emit("rematchDeclined");
//         return;
//       }

//       // If opponent already requested -> both want rematch => immediate newGame
//       if (room.rematchRequesterId && room.rematchRequesterId !== socket.id) {
//         // other already requested
//         room.rematchRequesterId = null;
//         try {
//           users[room.player1Id]?.socket.emit("newGame");
//           users[room.player2Id]?.socket.emit("newGame");
//         } catch (err) {}
//         return;
//       }

//       // set requester & notify both
//       room.rematchRequesterId = socket.id;
//       socket.emit("waitingForRematch");
//       try {
//         users[otherId]?.socket.emit("rematchOffer", { from: user.playerName || "Player" });
//       } catch (err) {}
//     });

//     // Response to rematch popup (from opponent)
//     socket.on("playAgainResponse", (data) => {
//       const user = users[socket.id];
//       if (!user || !user.roomCode) return;
//       const room = rooms.get(user.roomCode);
//       if (!room) return;

//       const requesterId = room.rematchRequesterId;
//       // if no pending request, ignore
//       if (!requesterId) return;

//       const requester = users[requesterId];
//       const otherId = getOpponentIdInRoom(room, requesterId);

//       // accept flow
//       if (data?.accept) {
//         room.rematchRequesterId = null;
//         try {
//           if (requester) requester.socket.emit("newGame");
//           if (users[otherId]) users[otherId].socket.emit("newGame");
//         } catch (err) {}
//       } else {
//         // declined: notify requester and clear flag
//         room.rematchRequesterId = null;
//         if (requester) {
//           try {
//             requester.socket.emit("rematchDeclined");
//           } catch (err) {}
//         }
//       }
//     });

//     // handle disconnect / cleanup
//     socket.on("disconnect", () => {
//       const currentUser = users[socket.id];
//       if (!currentUser) {
//         delete users[socket.id];
//         return;
//       }

//       // remove from quickQueue if present
//       const idx = quickQueue.indexOf(socket.id);
//       if (idx !== -1) quickQueue.splice(idx, 1);

//       // tell opponent if in a room
//       if (currentUser.roomCode) {
//         const room = rooms.get(currentUser.roomCode);
//         if (room) {
//           const otherId = getOpponentIdInRoom(room, socket.id);
//           if (otherId && users[otherId]) {
//             try {
//               users[otherId].socket.emit("opponentLeftMatch");
//             } catch (err) {}
//             users[otherId].playing = false;
//             users[otherId].roomCode = null;
//           }

//           // remove player from room and cleanup
//           if (room.player1Id === socket.id) room.player1Id = null;
//           if (room.player2Id === socket.id) room.player2Id = null;
//           cleanupRoomIfEmpty(currentUser.roomCode);
//         }
//       }

//       delete users[socket.id];
//     });
//   });
// }



// sockets/tictactoe.js
// TicTacToe namespace: quick match (fixed), private rooms, rematch (accept/decline)

function makeRoomCode(existingCodesSet) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // easy to read
  let code;
  do {
    code = Array.from({ length: 6 })
      .map(() => chars[Math.floor(Math.random() * chars.length)])
      .join("");
  } while (existingCodesSet.has(code));
  return code;
}

export default function registerTicTacToe(io) {
  const nsp = io.of("/tictactoe");

  // users: socketId -> { socket, online, playing, playerName, roomCode }
  const users = {};

  // rooms: roomCode -> { code, player1Id, player2Id, rematchRequesterId }
  const rooms = new Map();

  // Quick Play queue: only users who clicked Quick Play
  const quickQueue = [];

  function getOpponentIdInRoom(room, socketId) {
    if (!room) return null;
    if (room.player1Id === socketId) return room.player2Id;
    if (room.player2Id === socketId) return room.player1Id;
    return null;
  }

  function startMatch(roomCode) {
    const room = rooms.get(roomCode);
    if (!room || !room.player1Id || !room.player2Id) return;

    const p1 = users[room.player1Id];
    const p2 = users[room.player2Id];
    if (!p1 || !p2) return;

    p1.playing = true;
    p2.playing = true;
    room.rematchRequesterId = null;

    // Assign playingAs: player1 -> circle, player2 -> cross
    try {
      p1.socket.emit("OpponentFound", {
        opponentName: p2.playerName || "Player",
        playingAs: "circle",
      });
      p2.socket.emit("OpponentFound", {
        opponentName: p1.playerName || "Player",
        playingAs: "cross",
      });
    } catch (err) {}
  }

  function cleanupRoomIfEmpty(code) {
    const room = rooms.get(code);
    if (!room) return;
    if (!room.player1Id && !room.player2Id) {
      rooms.delete(code);
    }
  }

  function leaveRoom(socketId) {
    const user = users[socketId];
    if (!user || !user.roomCode) return;
    const code = user.roomCode;
    const room = rooms.get(code);
    if (!room) {
      user.roomCode = null;
      return;
    }

    if (room.player1Id === socketId) room.player1Id = null;
    if (room.player2Id === socketId) room.player2Id = null;

    const opponentId = getOpponentIdInRoom(room, socketId);
    if (opponentId && users[opponentId]) {
      const opp = users[opponentId];
      opp.playing = false;
      opp.roomCode = null;
      try {
        opp.socket.emit("opponentLeftMatch");
      } catch (err) {}
    }

    cleanupRoomIfEmpty(code);
    user.roomCode = null;
    user.playing = false;
  }

  nsp.on("connection", (socket) => {
    users[socket.id] = {
      socket,
      online: true,
      playing: false,
      playerName: null,
      roomCode: null,
    };

    // --- QUICK PLAY ---
    socket.on("request_to_play", (data) => {
      const currentUser = users[socket.id];
      if (!currentUser) return;
      currentUser.playerName = data?.playerName || "Player";

      // Add to quickQueue if not already in it
      if (!quickQueue.includes(socket.id)) quickQueue.push(socket.id);

      // Try to find opponent from the queue
      const opponentId = (() => {
        if (quickQueue.length > 1) {
          // first other player in the queue
          for (let id of quickQueue) {
            if (id !== socket.id) return id;
          }
        }
        return null;
      })();

      if (opponentId) {
        // remove both from queue
        const idx1 = quickQueue.indexOf(socket.id);
        if (idx1 !== -1) quickQueue.splice(idx1, 1);
        const idx2 = quickQueue.indexOf(opponentId);
        if (idx2 !== -1) quickQueue.splice(idx2, 1);

        const existingCodes = new Set([...rooms.keys()]);
        const code = makeRoomCode(existingCodes);
        const room = {
          code,
          player1Id: opponentId,
          player2Id: socket.id,
          rematchRequesterId: null,
        };
        rooms.set(code, room);
        users[opponentId].roomCode = code;
        currentUser.roomCode = code;

        startMatch(code);
      } else {
        socket.emit("OpponentNotFound");
      }
    });

    // --- CREATE PRIVATE ROOM ---
    socket.on("createRoom", (data) => {
      const currentUser = users[socket.id];
      if (!currentUser) return;
      currentUser.playerName = data?.playerName || "Player";

      leaveRoom(socket.id);

      const existingCodes = new Set([...rooms.keys()]);
      const code = makeRoomCode(existingCodes);
      const room = {
        code,
        player1Id: socket.id,
        player2Id: null,
        rematchRequesterId: null,
      };
      rooms.set(code, room);
      currentUser.roomCode = code;

      socket.emit("roomCreated", { code });
    });

    // --- JOIN PRIVATE ROOM ---
    socket.on("joinRoom", (data) => {
      const currentUser = users[socket.id];
      if (!currentUser) return;
      currentUser.playerName = data?.playerName || "Player";

      const raw = (data?.code || "").toString().trim().toUpperCase();
      if (!raw) {
        socket.emit("roomJoinError", { message: "Invalid room code." });
        return;
      }

      const room = rooms.get(raw);
      if (!room) {
        socket.emit("roomJoinError", { message: "Room not found." });
        return;
      }

      if (room.player1Id && room.player2Id) {
        socket.emit("roomJoinError", { message: "Room is full." });
        return;
      }

      leaveRoom(socket.id);

      if (!room.player1Id) room.player1Id = socket.id;
      else if (!room.player2Id) room.player2Id = socket.id;

      currentUser.roomCode = raw;

      if (room.player1Id && room.player2Id) startMatch(raw);
      else socket.emit("roomJoinedWaiting", { code: raw });
    });

    // --- PLAYER MOVE ---
    socket.on("playerMoveFromClient", (data) => {
      const user = users[socket.id];
      if (!user || !user.roomCode) return;
      const room = rooms.get(user.roomCode);
      if (!room) return;
      const otherId = getOpponentIdInRoom(room, socket.id);
      if (!otherId) return;
      const other = users[otherId];
      if (!other) return;
      try {
        other.socket.emit("playerMoveFromServer", { ...data });
      } catch (err) {}
    });

    // --- REMATCH ---
    socket.on("playAgainRequest", () => {
      const user = users[socket.id];
      if (!user || !user.roomCode) return;
      const room = rooms.get(user.roomCode);
      if (!room) return;

      const otherId = getOpponentIdInRoom(room, socket.id);
      if (!otherId || !users[otherId]) {
        socket.emit("rematchDeclined");
        return;
      }

      if (room.rematchRequesterId && room.rematchRequesterId !== socket.id) {
        room.rematchRequesterId = null;
        try {
          users[room.player1Id]?.socket.emit("newGame");
          users[room.player2Id]?.socket.emit("newGame");
        } catch (err) {}
        return;
      }

      room.rematchRequesterId = socket.id;
      socket.emit("waitingForRematch");
      try {
        users[otherId]?.socket.emit("rematchOffer", { from: user.playerName || "Player" });
      } catch (err) {}
    });

    socket.on("playAgainResponse", (data) => {
      const user = users[socket.id];
      if (!user || !user.roomCode) return;
      const room = rooms.get(user.roomCode);
      if (!room) return;

      const requesterId = room.rematchRequesterId;
      if (!requesterId) return;

      const requester = users[requesterId];
      const otherId = getOpponentIdInRoom(room, requesterId);

      if (data?.accept) {
        room.rematchRequesterId = null;
        try {
          if (requester) requester.socket.emit("newGame");
          if (users[otherId]) users[otherId].socket.emit("newGame");
        } catch (err) {}
      } else {
        room.rematchRequesterId = null;
        if (requester) {
          try {
            requester.socket.emit("rematchDeclined");
          } catch (err) {}
        }
      }
    });

    // --- DISCONNECT ---
    socket.on("disconnect", () => {
      const currentUser = users[socket.id];
      if (!currentUser) {
        delete users[socket.id];
        return;
      }

      // remove from queue if present
      const idx = quickQueue.indexOf(socket.id);
      if (idx !== -1) quickQueue.splice(idx, 1);

      leaveRoom(socket.id);

      delete users[socket.id];
    });
  });
}

