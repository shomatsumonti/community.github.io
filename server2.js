const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile('index2.html', (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200);
      res.end(data);
    });
  }
});

const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuidv4();
  const color = Math.floor(Math.random()*16777215).toString(16);
  const metadata = { id, color, x: 0, y: 0, z: 0, name: '' };
  
  clients.set(ws, metadata);

  console.log(`New client connected: ${id}`);

  ws.send(JSON.stringify({ type: 'connect', id: id, color: color }));

  ws.on('message', (messageAsString) => {
    const message = JSON.parse(messageAsString);
    const metadata = clients.get(ws);

    console.log(`Received message from ${metadata.id}:`, message);

    switch(message.type) {
      case 'setName':
        metadata.name = message.name;
        console.log(`Setting name for ${metadata.id}: ${metadata.name}`);
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: 'playerName',
            id: metadata.id,
            name: metadata.name
          }));
        });
        break;
      case 'chat':
        console.log(`Chat message from ${metadata.id}: ${message.message}`);
        wss.clients.forEach((client) => {
          client.send(JSON.stringify({
            type: 'chat',
            id: metadata.id,
            name: metadata.name,
            message: message.message
          }));
        });
        break;
      case 'move':
        metadata.x = message.x;
        metadata.y = message.y;
        metadata.z = message.z;
        wss.clients.forEach((client) => {
          if (client !== ws) {
            client.send(JSON.stringify({
              type: 'move',
              id: metadata.id,
              x: metadata.x,
              y: metadata.y,
              z: metadata.z
            }));
          }
        });
        break;
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${metadata.id}`);
    clients.delete(ws);
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({
        type: 'disconnect',
        id: metadata.id
      }));
    });
  });
});

server.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});
