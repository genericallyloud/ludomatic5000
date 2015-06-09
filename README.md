# ludomatic5000
This is a simple tool which can help rapidly prototype cards/tiles/chits for board/card games.
It uses csv files to import data, and jade templates to generate html from them. Finally, it
uses wkhtmltopdf to generate pdfs which can be printed.

# Installation
- Download and install [wkhtmltopdf](http://wkhtmltopdf.org/downloads.html).
- Install [node.js](https://nodejs.org/).
- From the terminal, run `npm install ludomatic5000 -g`.
- You should now be able to use the `ludo` command.

# Usage
- cd to a directory that you want to put your new project
- Use the command `ludo init`
- To see the default print results, use the command `ludo draw`.
- To open a browser window for feedback when designing, use the command `ludo design`.

# Creating your game
There are 3 required files for any component of a game.

- The template: This is a jade or mustache template in the `templates` directory. 
- The styles: This is a css file in the `styles` directory.
- The data: This is a csv file in the `data` directoy.

Your template and styles files will be responsible for outputting the html and styling for a single component.
Ludomatic will handle the rest by inserting that html into a layout file which will be sized correctly for your
target output. Using `ludo init` will create the stub files you need. Using `ludo new <component-name>` will create
a new component in the same project directory.