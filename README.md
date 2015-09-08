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

# Options
  
    usage: ludo [<options] <command> <component>
    
    Global Options:
      -h, --help                          Display help
      -v, --version                       Output version information and exit
    
    Draw Options:
      -t, --target <target>               What print/print company format should be
                                          used? Avaliable options are "pnp" for
                                          print and play printing on a personal printer
                                          or "tgc" for output targeting "The Game Crafter"
      -o, --output <outputfile>           Path and filename of the output pdf in the case
                                          of print and play, or the output directory in
                                          case of The Game Crafter output.
      -p, --paper <papersize>             I the case of pnp, allows you to specify what type of
                                          paper should be used to layout the components for
                                          the output pdf. Available sizes are "letter" and "a4"
    Design Options:
          --port <portnumber>             When the server runs, which port should be used?
                                          
    
    The commands are:
        init [empty]                      Initializes a new project with the correct default directories,
                                          default data/template/style files and configuration file. If 
                                          "empty" is specified as an arg, it will only generate the
                                          directories and config file.
        new <component>                   Adds a new component, generating stub data/template/style files,
                                          and adding an entry to the ludo.json config file.
        draw <component>                  Generates output file(s) based on the selected target.
        design <component>                Opens a webpage which displays an interactive live preview of the
                                          component being designed.
       
    The component specied after the command indicates which component should be drawn or designed.
    Knowing the component determines which data/template/styles should be used. Configuration specific
    to a component can either use defaults, specify configuration in the ludo.json file, or override from
    the command line options.
