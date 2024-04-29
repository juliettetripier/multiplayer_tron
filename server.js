/**
 * This is the main Node.js server script for your project
 * Check out the two endpoints this back-end API provides in fastify.get and fastify.post below
 */

const path = require("path");

const EventEmitter = require('node:events');

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // Set this to true for detailed logging:
  logger: false,
});

fastify.register(require('@fastify/websocket'));
fastify.register(async function (fastify) {
  const lobby = new Lobby();
  fastify.get('/wss', { websocket: true }, (connection /* SocketStream */, req /* FastifyRequest */) => {
    connection.socket.on('message', message => {
      console.log('Message received');
      if (message.toString() === 'AI game please') {
        const newAIGame = new AIGame(connection);
        console.log(newAIGame);
      };
      if (message.toString() === 'multiplayer game please') {
        lobby.handleConnection(connection);
      }
      console.log(message.toString());
    });
  });
});

const sleep = (delayMS) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, delayMS);
  });
}

class AIGame {
  constructor(client) {
    this.client = client;
    this.runAI();
  }

  sendMessage(command) {
    this.client.socket.send(command);
  }

  async runAI() {
    await sleep(1000);
    this.sendMessage('turnUp');
  }


};

class Lobby {
  constructor() {
    this.waitingPlayer = null;
    this.runningGames = {};
    this.currentID = 0;
  }

  handleConnection(connection) {
    if (this.waitingPlayer) {
      const newGame = new MultiplayerGame(connection, this.waitingPlayer);
      const ID = this.currentID;
      this.runningGames[ID] = newGame;
      // event listeners to prevent memory leak
      newGame.on('complete', () => {
        delete this.runningGames[ID];
        console.log('deleted game');
      });
      newGame.on('expired', () => {
        delete this.runningGames[ID];
      });
      newGame.on('closed', () => {
        delete this.runningGames[ID];
      });
      this.currentID += 1;
      this.waitingPlayer = null;
    }
    else {
      this.waitingPlayer = connection;
    }
  }
}

class MultiplayerGame extends EventEmitter {
  constructor(client1, client2) {
    super();
    this.client1 = client1;
    this.client2 = client2;
    this.installEventHandlers();
    this.startGame();
    this.running = true;
  }

  installEventHandlers() {
    const playerMovesDict = {'playerTurnUp':'turnDown', 'playerTurnDown':'turnUp',
      'playerTurnLeft':'turnRight', 'playerTurnRight':'turnLeft'};

    this.client1.socket.on('message', (message) => {
      if (playerMovesDict.hasOwnProperty(message)) {
        console.log('got turn message from client 1');
        this.client2.socket.send(playerMovesDict[message]);
      }
      else if (message === 'game complete' && this.running == true) {
        this.emit('complete');
        this.running = false;
        console.log('sent complete event');
      }
    });

    this.client2.socket.on('message', (message) => {
      if (playerMovesDict.hasOwnProperty(message)) {
        console.log('got turn message from client 2');
        this.client1.socket.send(playerMovesDict[message]);
      }
      else if (message === 'game complete' && this.running == true) {
        this.emit('complete');
        this.running = false;
        console.log('sent complete event');
      }
    });
  }

  startGame() {
    this.client1.socket.send('game ready');
    this.client2.socket.send('game ready');
  }
}


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
