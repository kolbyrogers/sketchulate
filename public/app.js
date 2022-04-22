const app = new Vue({
	el: "#app",
	data: {
		connection: null,
		page: "",
		user: {},
		userInput: "",
		canvas: null,
		x: null,
		y: null,
		isDrawing: false,
		guess: "",
		prompt: "",
		promptSet: false,
		players: [],
		hostStarted: false,
		toasts: [],
		roundOver: false,
		word: "",
	},
	methods: {
		isRoundOver: function () {
			for (var i = 0; i < this.players.length; i++) {
				player = this.players[i];
				if (player.type != "h" && player.remainingGuesses > 0) {
					this.roundOver = false;
					return;
				}
			}
			this.roundOver = true;
			roundOver = {
				type: "round over",
			};
			this.connection.send(JSON.stringify(roundOver));
		},
		newGame: function (status) {
			var newGame = {
				type: status,
			};
			this.connection.send(JSON.stringify(newGame));
		},
		getUserFromPlayerList: function () {
			if (this.user.name) {
				var player = this.players.filter((player) => {
					return player.name === this.user.name;
				});
				this.user = player[0];
				console.log("USER FROM PLAYER LIST:", this.user);
			}
		},
		makeToast: function (message) {
			this.toasts.push(message);
			setTimeout(() => {
				this.toasts.pop();
			}, 5000);
		},
		hostStart: function () {
			this.setPrompt();
			const start = {
				type: "start",
			};
			this.connection.send(JSON.stringify(start));
		},
		setPrompt: function () {
			this.promptSet = true;
			const prompt = {
				type: "prompt",
				user: this.user,
				prompt: this.prompt,
			};
			this.connection.send(JSON.stringify(prompt));
		},
		guessWord: function () {
			const guess = {
				type: "guess",
				user: this.user,
				guess: this.guess,
			};
			this.guess = "";
			this.connection.send(JSON.stringify(guess));
		},
		play: function (type) {
			this.user.name = this.userInput;
			this.user.type = type;
			this.user.score = 0;
			this.user.remainingGuesses = 3;
			this.page = "play";
			const player = {
				type: "player",
				player: this.user,
			};
			this.connection.send(JSON.stringify(player));
			this.setUpCanvas();
		},
		setUpCanvas: function () {
			var c = document.getElementById("canvas");
			this.canvas = c.getContext("2d");
			this.canvas.clearRect(0, 0, c.width, c.height);
		},
		setUpCanvasWaiting: function () {
			var c = document.getElementById("waiting-canvas");
			this.canvas = c.getContext("2d");
			this.canvas.clearRect(0, 0, c.width, c.height);
		},
		drawLine: function (x1, y1, x2, y2) {
			let ctx = this.canvas;
			ctx.beginPath();
			ctx.strokeStyle = "Black";
			ctx.lineWidth = 2;
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			ctx.stroke();
			ctx.closePath();
			const data = {
				type: "coordinates",
				x1: x1,
				y1: y1,
				x2: x2,
				y2: y2,
			};
			if (this.user.type == "h" && this.page !== "waiting") {
				this.connection.send(JSON.stringify(data));
			}
		},
		draw: function (e) {
			if (this.user.type == "h") {
				if (this.isDrawing) {
					this.drawLine(this.x, this.y, e.offsetX, e.offsetY);
					this.x = e.offsetX;
					this.y = e.offsetY;
				}
			}
		},
		beginDrawing: function (e) {
			if (this.user.type == "h") {
				this.x = e.offsetX;
				this.y = e.offsetY;
				this.isDrawing = true;
			}
		},
		stopDrawing: function (e) {
			if (this.user.type == "h") {
				if (this.isDrawing) {
					this.drawLine(this.x, this.y, e.offsetX, e.offsetY);
					this.x = 0;
					this.y = 0;
					this.isDrawing = false;
				}
			}
		},
		handleUserWait: function () {
			app.user = { type: "h" };
			app.page = "waiting";
			app.setUpCanvasWaiting();
		},
	},
	created: function () {
		var HOST = location.origin.replace(/^http/, "ws");
		this.connection = new WebSocket(HOST);

		this.connection.onmessage = function (event) {
			const message = event.data;
			const data = JSON.parse(message);
			switch (data.type) {
				case "greeting":
					app.handleUserWait();
					break;
				case "coordinates":
					if (app.user.type && app.page != "waiting") {
						app.drawLine(data.x1, data.y1, data.x2, data.y2);
					}
					break;
				case "word":
					if (app.user.type) {
						app.word = data.word;
					} else {
						app.handleUserWait();
					}
					break;
				case "players":
					app.players = data.players;
					app.getUserFromPlayerList();
					break;
				case "start":
					app.hostStarted = true;
					break;
				case "correctGuess":
					if (data.user.name != app.user.name) {
						app.makeToast(`${data.user.name} guessed correctly!`);
					} else {
						app.makeToast("Correct!");
					}
					app.players = data.players;
					app.getUserFromPlayerList();
					app.isRoundOver();
					break;
				case "incorrectGuess":
					app.players = data.players;
					app.getUserFromPlayerList();
					if (data.user.remainingGuesses == 0 && data.user.name != app.user.name) {
						app.makeToast(`${data.user.name} ran out of guesses`);
					}
					app.isRoundOver();
					break;
				case "restart":
					app.user = {};
					app.players = [];
					app.hostStarted = false;
					app.guess = "";
					app.prompt = "";
					app.promptSet = false;
					app.roundOver = false;
					app.page = "main";
					if (data.message != null && this.page != "main") {
						alert(data.message);
					}
					break;
				case "continue":
					if (app.page == "waiting") {
						app.user = {};
						app.page = "main";
					} else {
						app.page = "play";
					}
					app.players = data.players;
					app.getUserFromPlayerList();
					app.hostStarted = false;
					app.guess = "";
					app.prompt = "";
					app.promptSet = false;
					app.roundOver = false;
					app.setUpCanvas();
					break;
			}
		};

		this.connection.onopen = function (event) {
			console.log("Connected to WS Server");
		};
		this.page = "main";
	},
});
