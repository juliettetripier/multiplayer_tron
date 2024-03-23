/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

const clients = new Set();

// Instantiate state variable
let state = 0;

fastify.register(require('@fastify/websocket'));
fastify.register(async function (fastify) {
  fastify.get('/wss', { websocket: true }, (connection /* SocketStream */, req /* FastifyRequest */) => {
    clients.add(connection)
    connection.socket.send(state);
    connection.socket.on('message', message => {
      // message.toString() === 'hi from client'
      console.log('Message received');
      console.log(message.toString());
      console.log(state)
      state += 1;
      clients.forEach((client) => {
        client.socket.send(state);
      })
      // connection.socket.send(state);
    })
    connection.socket.onmessage('AI game please', () => {
      const newAIGame = new AIGame(connection);
      console.log(newAIGame);
    })
  })
})

class AIGame {
  constructor(client) {
    this.client = client;
    this.sendMessage();
  }
  sendMessage() {
    this.client.socket.send('start AI game');
  }
}

// ADD FAVORITES ARRAY VARIABLE FROM TODO HERE

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/", // optional: default '/'
});

// Create HTML file


// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
  }
);
