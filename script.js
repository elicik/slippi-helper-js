const { default: SlippiGame, characters, stages } = require("slp-parser-js");
const fs = require("fs");
const path = require("path");
const readlineSync = require("readline-sync");
const ProgressBar = require("progress");
const chalk = require("chalk");
let argv = require("yargs")
	.option("killed", {
		alias: "k",
		describe: "Combos that killed the opponent",
		default: true,
		type: "boolean",
	})
	.option("percent", {
		alias: "p",
		describe: "Minimum amount of damage given",
		type: "number",
	})
	.option("moves", {
		alias: "m",
		describe: "Minimum number of moves used",
		type: "number",
	})
	.option("tag", {
		alias: "t",
		describe: "Filter by nametag",
		type: "string",
	})
	.version(false)
	.help()
	.argv;

console.log(argv.killed);
console.log(argv.percent);
console.log(argv.moves);
console.log(argv.tag);


let characterName = function(character) {
	return characters.getCharacterColorName(character.characterId, character.characterColor) + " " + characters.getCharacterShortName(character.characterId);
}

let slippi_files = [];

process.stderr.write(chalk.bold("Scanning files..."));
let folders = fs.readdirSync(path.join(__dirname, "recordings"));
for (let tournament of folders) {
	let stations = fs.readdirSync(path.join(__dirname, "recordings", tournament));
	for (let station of stations) {
		let games = fs.readdirSync(path.join(__dirname, "recordings", tournament, station));
		for (let game of games) {
			let game_path = path.join(__dirname, "recordings", tournament, station, game);
			let slippi = new SlippiGame(game_path);
			let containsEli = slippi.getSettings().players.some(player => player.nametag === "ELI");
			let numPlayers = slippi.getSettings().players.length;
			if (containsEli && numPlayers === 2) {
				slippi_files.push(slippi);
			}
		}
	}
}

process.stderr.clearLine();
process.stderr.cursorTo(0);

console.log(`${chalk.bold("Scanned files")}. Found ${chalk.bold.blue(slippi_files.length)} games from ${chalk.bold.blue(folders.length)} tournaments.`);
let bar = new ProgressBar(`${chalk.bold("Detecting combos...")} ${chalk.green("[:bar]")} :percent (:etas remaining)`, {total: slippi_files.length, width: 20, clear: true});

let finaljson = {
	"mode": "queue",
	"replay": "",
	"isRealTimeMode": false,
	"queue": [],
};
for (let i = 0; i < slippi_files.length; i++) {
	let slippi = slippi_files[i];
	let eliPlayerIndex = slippi.getSettings().players.find(player => player.nametag === "ELI").playerIndex;
	let combos = slippi.getStats().combos;
	for (let combo of combos) {
		if (combo.playerIndex === eliPlayerIndex && combo.moves.length >= 4 && (combo.endPercent - combo.startPercent) >= 30) {
			let filepath = "C:\\Users\\Eli\\Downloads\\Slippi\\" + path.relative("", slippi.input.filePath).split("/").join("\\");
			let obj = {
				"path": filepath,
				"startFrame": Math.max(combo.startFrame - 150, 0),
				"endFrame": combo.endFrame + 150,
				"length": combo.moves.length,
				"percent": combo.endPercent - combo.startPercent,
				"stage": stages.getStageName(slippi.getSettings().stageId),
				"eli": characterName(slippi.getSettings().players.find(player => player.nametag === "ELI")),
				"opponent": characterName(slippi.getSettings().players.find(player => player.nametag !== "ELI")),
			};
			finaljson["queue"].push(obj);
		}
	}
	bar.tick();
}
console.log(`${chalk.bold("Detected combos.")} Found ${chalk.bold.blue(finaljson["queue"].length)} combos.`);

shuffle = function(arr) {
	// Fisher-Yates shuffle
	for (let i = (arr.length - 1); i > 0; i -= 1) {
		let randomIndex = Math.floor(Math.random() * (i + 1));
		let temp = arr[randomIndex];
		arr[randomIndex] = arr[i];
		arr[i] = temp;
	}
}
adjacentPath = function(arr) {
	for (let i = 0; i < arr.length - 1; i++) {
		let game1 = arr[i];
		let game2 = arr[i+1];
		if (game1["path"] === game2["path"] || (game1["stage"] === game2["stage"] && game1["eli"] === game2["eli"] && game1["opponent"] === game2["opponent"])) {
			return true;
		}
	}
	return false;
}
while (adjacentPath(finaljson["queue"])) {
	shuffle(finaljson["queue"]);
}

replacer = function(key, value) {
	// Filtering out properties
	if (["length", "percent", "stage", "eli", "opponent"].includes(key)) {
		return undefined;
	}
	return value;
}
fs.writeFileSync("combos.json", JSON.stringify(finaljson, replacer));
fs.writeFileSync("readablecombos.json", JSON.stringify(finaljson["queue"], null, "\t"));
console.log(`All combos saved!`);