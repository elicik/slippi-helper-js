# slippi-helper-js
A helper tool to take .slp files (Slippi replays) and help turn them into combo videos.

You can find the latest release [here](https://github.com/elicik/slippi-helper-js/releases).

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
  -w, --wobbling  Include combos with 6 or more Ice Climbers pummels
                                                      [boolean] [default: false]
  -s, --shuffle   Shuffle the order of the final JSON to avoid using the same
                  match twice in a row (if possible)  [boolean] [default: false]
  -v, --version   Show version number                                  [boolean]
  -h, --help      Show help                                            [boolean]
```
Example:
```
> .\slippi-helper-js-win.exe recordings -k=false -p=40 -m=4 -t=ELI -s
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

To run Dolphin with these combos, move the combos.js to the directory with Dolphin, and then run
```Dolphin.exe -i combos.json -e "C:/path/to/melee.iso"```
