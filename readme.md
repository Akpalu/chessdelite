# Overview
Chessdelite is a chess training program. It is going to be a program for [annotating (in the technical, machine-learning sense)](https://www.telusinternational.com/articles/what-is-data-annotation) chess positions and moves in a way that lets the program capture how humans relate to chess positions, and thus home in on which concepts the user is having trouble with and construct instructional materials that exercise and train the user in the implementation of those concepts.

Chessdelite has a database, but the database’s purpose is not to store umpteen million games. Instead, the data store is designed so that you can tag moves (and their alternatives) in great detail, set up an opening repertoire, input theoretical endings or other stand-alone positions, and the program can generate adaptive quizzes that implement [spaced repetition learning](https://en.wikipedia.org/wiki/Spaced_repetition) for whatever phase of the game you wish to work on. 

Chessdelite will also have the ability to import and tag your own games, because if the program can’t process your own games, then it’s really not training you to play better; it’s training you to do quizzes. There is definitely some correlation between the two, but Chessdelite is conceived as a system that will customize its instruction based on feedback from the user’s own play. 

Because of the richer tagging system, the program should be able to develop an internal representation of fairly complex chess concepts, like prioritizing moves that provoke complications in losing positions, or which eliminate counterplay in winning ones. It will even be possible to profile specific opponents and drill the user on things like opening choice and level of complications against them – however the user wants to set it up. Once the program has a large enough sample, it should be able to apply tags independently, speeding up the process.
# The Name
The name derives from the current database format – sqlite – and because chess should be fun to work on, not a source of trauma. 
# What’s here now and how it works
This (very early) iteration is simply a basic interface, with some data acquisition and display capabilities. It displays the list of moves for a game, displays the game position on a board, and allows the user to navigate the game by clicking on moves or on arrow buttons.

Beside the move list, the program displays a palette of thumbnail chessboards displaying chess openings. When the user chooses an opening, the palette changes recursively to display the variations of that choice. The program displays a list of games featuring that variation below the thumbnails, and choosing a game from that list loads it onto the chessboard and move list. You can see it in action here:
[https://chessdelite.mushroomthejournal.com/](https://chessdelite.mushroomthejournal.com/)

There is also a jupyter notebook (Chess Delite Support.ipynb, in the root directory) that allows the smooth import of PGN games, and also gives annotated examples of how to build an opening tree (for population of the openings palette). 
# Technical details
The only technical innovation in this iteration is for the serialization (and retrieval) of moves via PyChess and sqlite, which is something that I haven’t seen so far. The moves are stored in the database in a way that allows the program to grab an entire line as a unit, rather than needing to traverse a tree of moves one step at a time (which is the data architecture of PyChess). This simplifies coding and hopefully speeds up assembling the lines for display in the front end move list. 

Architecturally, the two main data streams between back end and front end have been separated into objects of the class game_handler and openings_handler, which have their own separate JS files. This is not so much OOP as it is simply a means of implementing layers in the front end processing, and making that explicit through the directory structure. 
# Running it and dependencies
This project has two external dependencies (besides Flask!): the Python chess library (which I’ve called by its old name “PyChess” above just to make it clear that this is on the Python side of things) and chessboard js. The Flask file is chessdelite.py in the root directory. I've customized the chessboard js file a bit to accomodate this project's directory structure, and I've also changed its css a little to make the dark squares more legible in the opening thumbnails; so I've included those files in this repo.The directory structure is a little fiddly so I’ve made it a template repository so you can clone the files and directory structure all at once. 

Again, you can already see it in action here: [https://chessdelite.mushroomthejournal.com/](https://chessdelite.mushroomthejournal.com/)
