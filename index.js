const { default: SlippiGame, characters, stages, moves } = require("slp-parser-js");
const fs = require("fs");
const path = require("path");
const readlineSync = require("readline-sync");
const ProgressBar = require("progress");
const chalk = require("chalk");
let argv = require("yargs")
	.usage("Usage: $0 [options]")
	.usage("Usage: $0 <directory> [options]")
	.usage("\nFolder structure should be <directory>/tournament_name/setup_num/game.slp")
	.option("k", {
		alias: "killed",
		describe: "Combos that killed the opponent",
		type: "boolean",
		default: true,
	})
	.option("p", {
		alias: "percent",
		describe: "Minimum amount of damage given",
		type: "number",
	})
	.option("m", {
		alias: "moves",
		describe: "Minimum number of moves used",
		type: "number",
	})
	.option("t", {
		alias: "tag",
		describe: "Filter by nametag",
		type: "string",
	})
	.option("w", {
		alias: "wobbling",
		describe: "Include combos with 6 or more Ice Climbers pummels",
		type: "boolean",
		default: false,
	})
	.option("s", {
		alias: "shuffle",
		describe: "Shuffle the order of the final JSON to avoid using the same match twice in a row (if possible)",
		type: "boolean",
		default: false,
	})
	.alias("v", "version")
	.version()
	.alias("h", "help")
	.argv;

console.log("Filtering with the following conditions:");
if (argv.killed) {
	console.log(`- The combo ${chalk.bold.red("killed")} the opponent`);
}
if (argv.percent) {
	console.log(`- The combo did at least ${chalk.bold.red(argv.percent + "%")} damage`);
}
if (argv.moves) {
	console.log(`- The combo contained at least ${chalk.bold.red(argv.moves)} moves`);
}
if (argv.tag) {
	console.log(`- The combo was performed by a player with the tag "${chalk.bold.red(argv.tag)}"`);
}
if (argv.wobbling) {
	console.log(`- The combo ${chalk.bold.red("may")} include wobbling`);
}

let characterName = function(player) {
	let tag = player.nametag;
	let color = characters.getCharacterColorName(player.characterId, player.characterColor);
	let character = characters.getCharacterShortName(player.characterId);
	if (tag) {
		return `${tag} - ${character}`;
	}
	else {
		return `${color} ${character}`;
	}
}

let slippi_files = [];
let dirname = argv._[0] || process.cwd();

process.stderr.write(chalk.bold("Scanning files..."));
let folders = fs.readdirSync(dirname, {withFileTypes: true});
for (let tournament of folders) {
	if (!tournament.isDirectory()) {
		continue;
	}
	let stations = fs.readdirSync(path.join(dirname, tournament.name), {withFileTypes: true});
	for (let station of stations) {
		if (!station.isDirectory()) {
			continue;
		}
		let games = fs.readdirSync(path.join(dirname, tournament.name, station.name), {withFileTypes: true});
		for (let game of games) {
			if (!game.isFile() || !game.name.endsWith(".slp")) {
				continue;
			}
			let game_path = path.join(dirname, tournament.name, station.name, game.name);
			let slippi = new SlippiGame(game_path);
			let containsTag = !argv.tag || slippi.getSettings().players.some(player => player.nametag === argv.tag);
			let numPlayers = slippi.getSettings().players.length;
			if (containsTag && numPlayers === 2) {
				slippi_files.push(slippi);
			}
		}
	}
}

process.stderr.clearLine();
process.stderr.cursorTo(0);

console.log(`${chalk.bold("Scanned files")}. Found ${chalk.bold.red(slippi_files.length)} games from ${chalk.bold.red(folders.length)} tournaments.`);
let bar = new ProgressBar(`${chalk.bold("Detecting combos...")} ${chalk.green("[:bar]")} :percent (:etas remaining)`,
	{
		total: slippi_files.length,
		width: 20,
		clear: true
	}
);

let finaljson = {
	"mode": "queue",
	"replay": "",
	"isRealTimeMode": false,
	"queue": [],
};
for (let i = 0; i < slippi_files.length; i++) {
	let slippi = slippi_files[i];
	let combos = slippi.getStats().combos;
	for (let combo of combos) {
		let comboer = slippi.getSettings().players.find(player => player.playerIndex === combo.playerIndex);
		let opponent = slippi.getSettings().players.find(player => player.playerIndex === combo.opponentIndex);
		let matchesKilled = !argv.killed || combo.didKill;
		let matchesPercent = !argv.percent || (combo.endPercent - combo.startPercent) >= argv.percent;
		let matchesMoves = !argv.moves || combo.moves.length >= argv.moves;
		let matchesTag = !argv.tag || comboer.nametag === argv.tag;
		let numPummels = combo.moves.filter(m => moves.getMoveShortName(m) === "pummel").length;
		let wobble = characters.getCharacterShortName(comboer.characterId) === "ICs" && numPummels >= 6;
		if (matchesKilled && matchesPercent && matchesMoves && matchesTag && (!wobble || argv.wobbling)) {
			let filepath = slippi.input.filePath;
			finaljson["queue"].push({
				"path": filepath,
				"startFrame": Math.max(combo.startFrame - 150, 0),
				"endFrame": combo.endFrame + 150,
				"moves": combo.moves.length,
				"percent": combo.endPercent - combo.startPercent,
				"stage": stages.getStageName(slippi.getSettings().stageId),
				"didKill": combo.didKill,
				"comboer": characterName(comboer),
				"opponent": characterName(opponent),
			});
		}
	}
	bar.tick();
}
console.log(`${chalk.bold("Detected combos.")} Found ${chalk.bold.red(finaljson["queue"].length)} combos.`);

if (argv.shuffle) {
	let shuffle = function(arr) {
		// Fisher-Yates shuffle
		for (let i = (arr.length - 1); i > 0; i -= 1) {
			let randomIndex = Math.floor(Math.random() * (i + 1));
			let temp = arr[randomIndex];
			arr[randomIndex] = arr[i];
			arr[i] = temp;
		}
	}
	let adjacentPath = function(arr) {
		for (let i = 0; i < arr.length - 1; i++) {
			let game1 = arr[i];
			let game2 = arr[i+1];
			if (game1["path"] === game2["path"]) {
				return true;
			}
		}
		return false;
	}
	let start = Date.now();
	// Only run for 2 seconds
	while (adjacentPath(finaljson["queue"]) && (Date.now() - start) < 2000) {
		shuffle(finaljson["queue"]);
	}
}

fs.writeFileSync("combos.json", JSON.stringify(finaljson, null, "\t"));
console.log(`Combos saved to ${chalk.bold("combos.json")}`);