const WebSocket = require("ws");
const express = require("express");

const PORT = process.env.PORT || 8080;
const app = express(PORT);
app.use(express.static("public"));
server = app.listen(PORT);

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
	var message = handleNewConnection(ws, req);
	ws.send(JSON.stringify(message));

	ws.on("message", (message) => {
		const data = JSON.parse(message);
		switch (data.type) {
			case "coordinates":
				sendToOthers(data, ws);
				break;
			case "player":
				var message = handleNewPlayer(data, ws);
				sendToAll(message);
				break;
			case "prompt":
				var message = handlePrompt(data);
				sendToAll(message);
				break;
			case "guess":
				var message = handleGuess(data);
				sendToAll(message);
				break;
			case "start":
				gameState.isStarted = true;
				sendToAll(data);
				break;
			case "round over":
				gameState.isStarted = false;
				break;
			case "restart":
				var message = handleRestart();
				sendToAll(message);
				break;
			case "continue":
				var message = handleContinue();
				sendToAll(message);
				break;
		}
	});
	ws.on("close", () => {
		var message = handleDisconnect(ws);
		sendToAll(message);
	});
});

var gameState = {
	word: "",
	playerList: [],
	roundsPlayed: 0,
	isStarted: false,
};

sendToAll = (message) => {
	wss.clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(message));
		}
	});
};

sendToOthers = (message, ws) => {
	wss.clients.forEach((client) => {
		if (client !== ws && client.readyState === WebSocket.OPEN) {
			client.send(JSON.stringify(message));
		}
	});
};

getUserFromPlayerList = (user) => {
	var player = gameState.playerList.filter((player) => {
		return player.name == user.name;
	});
	return player[0];
};

handleNewConnection = (ws, req) => {
	ws.id = req.headers["sec-websocket-key"];
	if (gameState.isStarted) {
		var message = { type: "greeting" };
	} else {
		var message = { type: "players", players: gameState.playerList };
	}
	return message;
};

handleDisconnect = (ws) => {
	for (var i = 0; i < gameState.playerList.length; i++) {
		player = gameState.playerList[i];
		if (player.id == ws.id) {
			gameState.playerList.splice(i, 1);
			if (player.type == "h") {
				var message = handleContinue();
				return message;
			}
			break;
		}
	}
	if (gameState.isStarted && gameState.playerList.length <= 1) {
		var message = handleRestart();
	} else {
		var message = {
			type: "players",
			players: gameState.playerList,
		};
	}
	return message;
};

handleNewPlayer = (data, ws) => {
	if (gameState.isStarted) {
		return { type: "greeting" };
	}
	data.player.id = ws.id;
	gameState.playerList.push(data.player);
	var message = {
		type: "players",
		players: gameState.playerList,
	};
	return message;
};

handlePrompt = (data) => {
	gameState.word = data.prompt.toLowerCase();
	var message = {
		type: "word",
		word: gameState.word,
	};
	return message;
};

handleGuess = (data) => {
	if (data.guess.toLowerCase() === gameState.word) {
		return handleCorrectGuess(data.user);
	} else {
		return handleIncorrectGuess(data.user);
	}
};

handleCorrectGuess = (user) => {
	var guesser = getUserFromPlayerList(user);
	guesser.score += 1;
	guesser.remainingGuesses = -1;
	const message = {
		type: "correctGuess",
		user: guesser,
		players: gameState.playerList,
	};
	return message;
};

handleIncorrectGuess = (user) => {
	var guesser = getUserFromPlayerList(user);
	guesser.remainingGuesses -= 1;
	const message = {
		type: "incorrectGuess",
		user: guesser,
		players: gameState.playerList,
	};
	return message;
};

handleRestart = () => {
	gameState.playerList = [];
	gameState.roundsPlayed = 0;
	gameState.isStarted = false;
	gameState.word = "";
	const message = {
		type: "restart",
		message: null,
	};
	return message;
};

setNewHost = () => {
	gameState.playerList.forEach((player) => {
		player.remainingGuesses = 3;
		if (player.type == "h") {
			player.type = "g";
		}
	});
	var hostIndex = gameState.roundsPlayed % gameState.playerList.length;
	gameState.playerList[hostIndex].type = "h";
};

handleContinue = () => {
	gameState.roundsPlayed++;
	setNewHost();
	const message = {
		type: "continue",
		players: gameState.playerList,
	};
	return message;
};
