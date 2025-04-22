# Accessibility Maze
Copyright (C) 2021 The Chang School, Ryerson University

This game is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License v3.0 as published by the Free Software Foundation.

This game is distributed in the hope that it will be useful, but __without any warranty__; without even the implied warranty of __merchantability__ or __fitness for a particular purpose__. For more details see [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html).
## Dependencies
This game is using the following libraries:

- AngularJS
- SoundJS
- PreloadJS
- jQuery
- Underscore.js
## Deployment
1. Fork the repository.
2. Upload files to your server.
3. Update `<base>` tag in the `index.html` to point to the new location.
## Game Data
The game is driven by the data stored in `_/amaze_data.json` file. There are three main sections in that file:

- `intro` - array of images and reference to variables that hold text for the intro sequence
- `levels` - array of levels:
    - `floorplan` - array of map rows and columns (9 rows 12 tiles each)
    - `description` - reference to a variable that holds short level description for screenreader users
    - `items` - array with additional data for interactive and collectible items included with the map
    - `inventory` - empty array to store collected items
    - `lesson` - reference to a variable that holds localised HTML displayed at the end of the level
- `outro` - array of images and reference to variables that hold text for the end-of-game sequence

## Localisation
This game was designed to support multiple languages. English, Dutch and French are already included by default. To add support for another language you need to:

- make a copy of one of the localisation files in `_/l10n` folder
- rename the file by replacing the old language code with the ISO 639-1 code for the language you are adding (for example, `locale_ru.json` for Russian, `locale_es.json` for Spanish, etc.)
- translate all string values inside the file to the new language
- add the new language option to the dropdown in the `_/tpl/languages.tpl.html` template file.
