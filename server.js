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
      console.log('making match');
      const newGame = new MultiplayerGame(connection, this.waitingPlayer.client);
      const ID = this.currentID;
      this.runningGames[ID] = newGame;
      newGame.on('complete', () => {
        delete this.runningGames[ID];
      });
      this.currentID += 1;
      this.waitingPlayer.gameStarted = true;
      this.waitingPlayer = null;
    }
    else {
      this.waitingPlayer = new WaitingPlayer(connection);
      this.waitingPlayer.on('expired', () => {
        console.log('lobby got expired message');
        this.waitingPlayer.gameExpired();
        this.waitingPlayer = null;
      });
      this.waitingPlayer.on('closed', () => {
        
      });

    }
  }
}

class WaitingPlayer extends EventEmitter {
  constructor(client) {
    super();
    this.client = client;
    this.gameStarted = false;
    this.setExpirationTimer();
  }

  async setExpirationTimer() {
    await sleep(300000);
    if (this.gameStarted === false) {
      console.log('expiration timer ran out');
      this.emit('expired');
    }
  }

  gameExpired() {
    this.client.socket.send('expired');
  }
}

class MultiplayerGame extends EventEmitter {
  constructor(client1, client2) {
    super();
    this.client1 = client1;
    this.client2 = client2;
    this.running = true;
    this.installEventHandlers();
    this.startGame();
  }

  installEventHandlers() {
    const playerMovesDict = {'playerTurnUp':'turnDown', 'playerTurnDown':'turnUp',
      'playerTurnLeft':'turnRight', 'playerTurnRight':'turnLeft'};

    this.client1.socket.on('message', (message) => {
      if (playerMovesDict.hasOwnProperty(message) && this.running == true) {
        this.client2.socket.send(playerMovesDict[message]);
      }
      else if (message.toString() === 'game complete' && this.running == true) {
        this.running = false;
        this.emit('complete');
      }
    });

    this.client2.socket.on('message', (message) => {
      if (playerMovesDict.hasOwnProperty(message) && this.running == true) {
        this.client1.socket.send(playerMovesDict[message]);
      }
      else if (message === 'game complete' && this.running == true) {
        this.emit('complete');
        this.running = false;
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
