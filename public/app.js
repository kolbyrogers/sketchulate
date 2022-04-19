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
			if (this.user.type == "h") {
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
	},
	created: function () {
		this.connection = new WebSocket("ws://sketchulate.herokuapp.com/");

		this.connection.onmessage = function (event) {
			const message = event.data;
			const data = JSON.parse(message);
			switch (data.type) {
				case "greeting":
					console.log(data.greeting);
					break;
				case "coordinates":
					if (app.user.type) {
						app.drawLine(data.x1, data.y1, data.x2, data.y2);
					}
					break;
				case "players":
					app.players = data.players;
					console.log(app.players);
					app.getUserFromPlayerList();
					break;
				case "start":
					app.hostStarted = true;
					break;
				case "correctGuess":
					app.makeToast(`${data.user.name} guessed correctly!`);
					app.players = data.players;
					app.getUserFromPlayerList();
					app.isRoundOver();
					break;
				case "incorrectGuess":
					app.players = data.players;
					app.getUserFromPlayerList();
					if (data.user.remainingGuesses == 0) {
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
					console.log("Restarted!");
					break;
				case "continue":
					app.players = data.players;
					app.getUserFromPlayerList();
					app.hostStarted = false;
					app.guess = "";
					app.prompt = "";
					app.promptSet = false;
					app.roundOver = false;
					app.setUpCanvas();
					app.page = "play";
					break;
			}
		};

		this.connection.onopen = function (event) {
			console.log("Connected to WS Server");
		};
		this.page = "main";
	},
});
