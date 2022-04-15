const WebSocket = require("ws");
const express = require("express");

const PORT = process.env.PORT || 8080;
const app = express(PORT);
server = app.listen(PORT);

var WORD_TO_GUESS = "";
var PLAYER_LIST = [];

const wss = new WebSocket.Server({ server });
wss.on("connection", (ws) => {
	console.log("socket connected...");
	const greeting = {
		type: "players",
		players: PLAYER_LIST,
	};
	ws.send(JSON.stringify(greeting));

	ws.on("message", (message) => {
		const data = JSON.parse(message);
		console.log("Parsed message:", data);
		switch (data.type) {
			case "coordinates":
				wss.clients.forEach((client) => {
					if (client !== ws && client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(data));
					}
				});
				break;
			case "player":
				PLAYER_LIST.push(data.player);
				console.log("updated player list:", PLAYER_LIST);
				var players = {
					type: "players",
					players: PLAYER_LIST,
				};
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(players));
					}
				});
				break;
			case "prompt":
				console.log(data.user.name, "is going to draw:", data.prompt);
				WORD_TO_GUESS = data.prompt.toLowerCase();
				break;
			case "guess":
				console.log(data.user.name, "guessed:", data.guess);
				if (data.guess.toLowerCase() === WORD_TO_GUESS) {
					var guesser = PLAYER_LIST.filter((player) => {
						return player.name == data.user.name;
					});
					guesser[0].score += 1;
					guesser[0].remainingGuesses = -1;
					var drawer = PLAYER_LIST.filter((player) => {
						return player.type === "h";
					});
					drawer[0].score += 1;
					const correctGuess = {
						type: "correctGuess",
						user: data.user,
						players: PLAYER_LIST,
					};
					wss.clients.forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify(correctGuess));
						}
					});
				} else {
					data.user.remainingGuesses -= 1;
					var guesser = PLAYER_LIST.filter((player) => {
						return player.name == data.user.name;
					});
					guesser[0].remainingGuesses -= 1;
					const incorrectGuess = {
						type: "incorrectGuess",
						user: data.user,
						players: PLAYER_LIST,
					};
					wss.clients.forEach((client) => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify(incorrectGuess));
						}
					});
				}
				break;
			case "start":
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(data));
					}
				});
				break;
			case "restart":
				PLAYER_LIST = [];
				const restart = {
					type: "restart",
				};
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(restart));
					}
				});
				break;
			case "continue":
				var hostChanged = false;
				for (var i = 0; i < PLAYER_LIST.length; i++) {
					PLAYER_LIST[i].remainingGuesses = 3;
					if (PLAYER_LIST[i].type === "h") {
						PLAYER_LIST[i].type = "g";
						continue;
					}
					if (PLAYER_LIST[i].type !== "h" && !hostChanged) {
						PLAYER_LIST[i].type = "h";
						hostChanged = true;
					}
				}
				console.log("REFRESHED", PLAYER_LIST);
				const game = {
					type: "continue",
					players: PLAYER_LIST,
				};
				wss.clients.forEach((client) => {
					if (client.readyState === WebSocket.OPEN) {
						client.send(JSON.stringify(game));
					}
				});
				break;
		}
	});
});
