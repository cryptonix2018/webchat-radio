const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get("/", (req, res) => {
  res.send(`  
<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8" />
<title>Videochat + Radio</title>
<style>
  body { font-family: Arial; text-align: center; background: #f4f4f4; }
  #video-container { display: flex; justify-content: center; gap: 20px; margin: 20px; }
  video { width: 45%; border-radius: 10px; border: 2px solid #333; }
  #chat-container { width: 60%; margin: auto; background: white; padding: 10px; border-radius: 10px; }
  #chat { height: 200px; overflow-y: auto; border: 1px solid #ccc; margin-bottom: 10px; text-align: left; padding: 5px; }
  input { width: 70%; padding: 5px; }
  button { padding: 5px 10px; }
</style>
</head>
<body>
<h2>Videochat + Radio me Chat</h2>
<div id="video-container">
  <video id="localVideo" autoplay muted></video>
  <video id="remoteVideo" autoplay></video>
</div>
<div id="chat-container">
  <h3>Chat</h3>
  <div id="chat"></div>
  <input type="text" id="messageInput" placeholder="Shkruaj mesazhin..." />
  <button id="sendBtn">Dërgo</button>
</div>
<h3>Radio Live</h3>
<audio controls autoplay>
  <source src="https://stream.radioparadise.com/aac-320" type="audio/mp3" />
  Shfletuesi yt nuk e mbështet radion.
</audio>

<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  const localVideo = document.getElementById("localVideo");
  const remoteVideo = document.getElementById("remoteVideo");
  const chat = document.getElementById("chat");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");

  let username = "";

  // Pyet emrin e përdoruesit
  while (!username) {
    username = prompt("Shkruaj emrin tënd të përdoruesit:");
    if (!username) username = "Anonim" + Math.floor(Math.random() * 1000);
  }

  // WebRTC setup
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localVideo.srcObject = stream;
      stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
    })
    .catch((err) => alert("Nuk mund të hapni kamerën dhe mikrofonin: " + err));

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };

  socket.on("offer", async (offer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", answer);
  });

  socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on("candidate", (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });

  async function startCall() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("offer", offer);
  }
  startCall();

  // Chat

  sendBtn.onclick = () => {
    const msg = messageInput.value.trim();
    if (!msg) return;
    socket.emit("chatMessage", { username, msg });
    messageInput.value = "";
  };

  socket.on("chatMessage", ({ username: user, msg }) => {
    const p = document.createElement("p");
    p.textContent = `[${user}]: ${msg}`;
    chat.appendChild(p);
    chat.scrollTop = chat.scrollHeight;
  });
</script>
</body>
</html>
`);
});

io.on("connection", (socket) => {
  console.log("Përdorues i lidhur:", socket.id);
  socket.on("offer", (data) => socket.broadcast.emit("offer", data));
  socket.on("answer", (data) => socket.broadcast.emit("answer", data));
  socket.on("candidate", (data) => socket.broadcast.emit("candidate", data));
  socket.on("chatMessage", (data) => io.emit("chatMessage", data));
  socket.on("disconnect", () => console.log("Përdorues u shkëput:", socket.id));
});

server.listen(3000, () => console.log("Server po punon në http://localhost:3000"));
