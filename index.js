const { default: SlippiGame, characters, stages, moves } = require("slp-parser-js");
const fs = require("fs");
const path = require("path");
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
		describe: "Include wobbling combos",
		type: "boolean",
		default: false,
	})
	.option("s", {
		alias: "shuffle",
		describe: "Avoid outputting adjacent matchs, if possible.\nIf disabled, combos may potentially get skipped.",
		type: "boolean",
		default: true,
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

let dirname = argv._[0] || process.cwd();

process.stderr.write(chalk.bold("Scanning files..."));
let folders = fs.readdirSync(dirname, {withFileTypes: true});
let game_paths = [];
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
			game_paths.push(game_path);
		}
	}
}
process.stderr.clearLine();
process.stderr.cursorTo(0);
console.log(`${chalk.bold("Scanned files")}. Found ${chalk.bold.red(game_paths.length)} games from ${chalk.bold.red(folders.length)} tournaments.`);
// Set to null to allow GC to free memory
folders = null;

let bar = new ProgressBar(`${chalk.bold("Filtering files...")} ${chalk.green("[:bar]")} :percent (:etas remaining)`,
	{
		total: game_paths.length,
		width: 20,
		clear: true
	}
);

let slippi_files = [];
for (let game_path of game_paths) {
	let slippi = new SlippiGame(game_path);
	let containsTag = !argv.tag || slippi.getSettings().players.some(player => player.nametag === argv.tag);
	let numPlayers = slippi.getSettings().players.length;
	if (containsTag && numPlayers === 2) {
		slippi_files.push(slippi);
	}
	bar.tick()
}
console.log(`${chalk.bold("Filtered files")}. Found ${chalk.bold.red(slippi_files.length)} eligible games out of ${chalk.bold.red(game_paths.length)}.`);
// Set to null to allow GC to free memory
game_paths = null;


let finaljson = {
	"mode": "queue",
	"replay": "",
	"isRealTimeMode": false,
	"queue": [],
};

bar = new ProgressBar(`${chalk.bold("Filtering combos...")} ${chalk.green("[:bar]")} :percent (:etas remaining)`,
	{
		total: slippi_files.length,
		width: 20,
		clear: true
	}
);
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
		let numPummels = combo.moves.filter(move => moves.getMoveShortName(move.moveId) === "pummel").length;
		let wobble = characters.getCharacterShortName(comboer.characterId) === "ICs" && numPummels >= 6;
		if (matchesKilled && matchesPercent && matchesMoves && matchesTag && (!wobble || argv.wobbling)) {
			finaljson["queue"].push({
				"path": path.resolve(slippi.input.filePath),
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
	// Set to null to allow GC to free memory
	slippi_files[i] = null;
}
console.log(`${chalk.bold("Filtered combos.")} Found ${chalk.bold.red(finaljson["queue"].length)} eligible combos from ${chalk.bold.red(slippi_files.length)} games.`);
// Set to null to allow GC to free memory
slippi_files = null;

if (argv.shuffle) {
	console.log(chalk.bold("Shuffling combos..."));
	// Unsure if this algorithm is actually optimal, but it's better than nothing
	let adjacentPath = function(arr) {
		for (let i = 0; i < arr.length - 1; i++) {
			let game1 = arr[i];
			let game2 = arr[i+1];
			if (game1["path"] === game2["path"]) {
				return i;
			}
		}
		return -1;
	}
	// Get all adjacent combos and add them to a stack
	let stack = [];
	let index = adjacentPath(finaljson["queue"]);
	while (index !== -1) {
		stack.push(finaljson["queue"].splice(index, 1)[0]);
		index = adjacentPath(finaljson["queue"]);
	}
	// For each combo, try to put it in a place it fits
	for (let combo of stack) {
		let possible = false;
		for (let i = 0; i < finaljson["queue"].length; i++) {
			let left = finaljson["queue"][Math.max(i-1, 0)];
			let right = finaljson["queue"][i];
			if (combo["path"] !== left["path"] && combo["path"] !== right["path"]) {
				finaljson["queue"].splice(i, 0, combo);
				possible = true;
				break;
			}
		}
		if (!possible) {
			// Just add to the end if impossible
			finaljson["queue"].push(combo);
		}
	}
	console.log(chalk.bold("Shuffled combos."));
	if (adjacentPath(finaljson["queue"]) !== -1) {
		console.log(`${chalk.bgRed("WARNING")} There are still adjacent combos with the same path. Dolphin playback may skip some combos.`);
	}
}

fs.writeFileSync("combos.json", JSON.stringify(finaljson, null, "\t"));
console.log(`Combos saved to ${chalk.bold("combos.json")}.`);