// server.js
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const port = process.env.PORT || 3000;

// so Express can parse JSON bodies
app.use(express.json());

// this handles HTTP POSTs from your actionHook (/gather)
app.post("/gather", (req, res) => {
  console.log("Received HTTP webhook from jambonz actionHook:", req.body);
  // respond with a simple 200 OK
  res.status(200).json({ message: "ok" });
});

// HTTP server (so that ngrok has something to hit)
const server = app.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
});

// WebSocket server mounted on same server
const wss = new WebSocketServer({ noServer: true });

// When Jambonz connects to our WebSocket
wss.on("connection", (ws) => {
  console.log("Incoming Jambonz WS connection");

  ws.on("message", (message) => {
    const msg = JSON.parse(message);
    console.log("Received from Jambonz:", msg);

    if (msg.type === "session:new") {
      const verbs = [
        {
          verb: "say",
          text: "Hello from my WebSocket app! Please say something after the beep.",
          voice: "Amy"
        },
        {
          verb: "gather",
          input: ["speech", "dtmf"],
          // you can change this to your full ngrok URL if needed
          actionHook: "/gather",
          timeout: 5
        },
        {
          verb: "say",
          text: "Goodbye.",
          voice: "Amy"
        },
        { verb: "hangup" }
      ];
      ws.send(JSON.stringify({ type: "session:reply", payload: verbs }));
    }

    if (msg.type === "gather") {
      console.log("User said / pressed:", msg.speech || msg.dtmf);
    }
  });

  ws.on("close", () => console.log("WS closed"));
});

// upgrade HTTP to WebSocket on path /jambonz
server.on("upgrade", (request, socket, head) => {
  if (request.url === "/jambonz") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});
