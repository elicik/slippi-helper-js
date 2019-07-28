# slippi-helper-js
A helper tool to take .slp files (Slippi replays) and help turn them into combo videos.

You can download the latest release [here](https://github.com/elicik/slippi-helper-js/releases/latest).

However, if you would like to contribute or just run the script using your own copy of node.js, you can clone the repository, run ```yarn``` or ```npm install``` to install all the dependencies, and then run with ```node ./index.js```.

## Usage:
```
> .\slippi-helper-js-win.exe -h
Usage: slippi-helper-js-win.exe [options]
Usage: slippi-helper-js-win.exe <directory> [options]

Folder structure should be <directory>/tournament_name/setup_num/game.slp

Options:
  -k, --killed    Combos that killed the opponent      [boolean] [default: true]
  -p, --percent   Minimum amount of damage given                        [number]
  -m, --moves     Minimum number of moves used                          [number]
  -t, --tag       Filter by nametag                                     [string]
  -w, --wobbling  Include wobbling combos             [boolean] [default: false]
  -s, --shuffle   Avoid outputting adjacent matchs, if possible.
                  If disabled, combos may potentially get skipped.
                                                       [boolean] [default: true]
  -v, --version   Show version number                                  [boolean]
  -h, --help      Show help                                            [boolean]
```
Example:
```
> .\slippi-helper-js-win.exe recordings -k=false -p=40 -m=4 -t=ELI
Filtering with the following conditions:
- The combo did at least 40% damage
- The combo contained at least 4 moves
- The combo was performed by a player with the tag "ELI"
Scanned files. Found 162 games from 9 tournaments.
Detected combos. Found 149 combos.
Combos saved to combos.json!
```


slippi-helper-js will output a ```combos.json``` file that contains all the information that you can use to connect to
the Slippi version of Dolphin, which is then recorded with something like OBS.

To run Dolphin with these combos, move combos.json to the directory with Dolphin, and then run
```Dolphin.exe -i combos.json -e "C:/path/to/melee.iso"```
