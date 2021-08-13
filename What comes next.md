# The next iteration: quiz creation and quiz response handling

# The big picture 
## Developing quiz functionality
### Core functionality
The starting point for the next iteration is simply presenting a quiz position on the interface chessboard (from data on the back end). Once that is in place, the work will bifurcate between the functionality before and after the user response: that is, (a) internally representing a sheaf of quiz positions, presenting a position to the user and then advancing to the next one, and (b) being able to collect the user response to each position, so that the program can process it and the (a) functionality can use the data in preparing future quizzes (and other future responses to the user).
### Ancillary functionality
We also need some ancillary functionality to make the core functionality more accessible to a user, and thus make important aspects of the program usable at an earlier stage. The sooner we can practice actually using the program, the sooner we’ll discover things that need to be fixed. 

Right away, we need to validate the legality of moves (chessboard.js lets you move any piece on the board to any other square). Well, strictly speaking if all we want to do right now is collect a move from the board, then it doesn’t really need to be a legal move. But at the next phase, we’re going to be working on the processing of these moves input from the board, and we want the handling of illegal moves to be out of the way before taking on that new task. 

Also, this information will need to come from the back end, and we need in general (see Data Handling discussion below) to do some restructuring and amplification of the data package that we Fetch. For the moment we’re still focused on fairly mechanical tasks, so this seems to be a good time to do that restructuring all at once. 

Because of these pragmatic considerations (earliest usability, Fetch restructuring, and separation of concerns) this is likewise a good time to add the functionality to set up positions, and enter solution or opening lines from the board (and display multiple lines for the loaded “game”). There’s a further discussion in the Ancillary Functionality section below.
## Next iteration
As noted above, once we have the absolute basic mechanics of displaying a position, this phase of functionality bifurcates into (a) displaying quiz positions and (b) collecting user response to those positions. The development of processing follows that architecture: for the (a) branch, routines to choose positions for quizzes, and for the (b) branch, functions for how the program responds to users’ answers. 

For now, I can stub these out in the interests of modularity – choosing positions can simply be random, and processing can simply be a capture to the back end. As soon as I start trying to have either of these functional areas do anything meaningful, it’s going to interact with the other area, so I’m leaving that strictly alone for now. 

There’s also a certain separation of concerns at work: the delimitation of this iteration means that almost all the work is on the front end. As soon as I start working on how to select quiz positions and how to respond to users’ answers, that work is all on the back end. This separation makes things a lot simpler than working on both at the same time. 
# Current dev tasks
## New data tables
I’m flying very low to the ground on this. For now there will just be two relational tables. One will just have a QuizID and a date. The other will be the sheaf of positions for each quiz; it  will have a relational reference to the QuizID, a Position ID, and the move that the user made in response.

That’s it. Processing the response will end up being fairly complicated, so I think I want to outsource all serialization of that to a separate table so that I can just swap a new table in and out there as the process evolves. 
## Data handling
### Position and Move IDs
To respond meaningfully to a quiz, we will now need to Fetch the unique IDs for both Positions and Moves to the front end. This actually may not be strictly necessary at the moment just to respond to the quiz (we could just Fetch the notation and FEN in question, as we’re now doing to display games) but it’s undoubtedly best in the long run and this is a good place to start. 

In any case, it will become necessary very quickly: once we’re adding tags through the front end, the tag-to-position connector table has to have a move ID to link up to. And it will also be necessary for displaying multiple lines (see the discussion of ancillary goals at the end of this document). 

Displaying quiz positions will also test the program’s handling of pre-move positions from FEN. Right now, the front end is Fetching a pre-move position from the back end, it’s just so far when importing games, that pre-move position is set to the starting position when a FEN isn’t provided. So the back to front Fetch is theoretically already implemented; we just have to make sure that it’s working correctly.

On the import side of things, we also have to make sure that our process is correctly importing a pre-move FEN that’s provided with the PGN, and also handling a pre-move position that comes from input via the program’s own chessboard. 
### Input moves from board (with validation)
To answer a quiz, we have to be able to input a move from the board. To ensure meaningful user responses :-) we have to validate the moves for legality. So the Fetch call from the back end will have to also retrieve a list of legal moves for each position. 

I’m not sure right now (and it doesn’t seem a huge issue) whether to generate a list of legal moves as the position pass through PyChess on the back end, or whether to store a list of legal moves with the position in the table. With me currently using the cheap and simple sqlite back end, lists can’t be stored as a field; so whatever sort of value is stored, it would need to undergo processing en route anyway, so one might as well just grab it from PyChess as we go. 

The one thing I don’t want to do is have the possible moves stored in a separate relational table with one legal move per record. This would require either multiple database calls per position or a huge recordset returned– and the need to programmatically assemble the valid move list from that recordset anyway. 

Whatever the back end solution, this will require a new field in the Fetch call for positions, to accommodate this list of legal moves, and the front end doesn’t need to know anything except that it’s getting the list in that field.
# Ancillary functionality
## Set up board
Create and save new individual positions (and enter the lines by hand). We want to be able to train standard endings, and I don’t know of a good FEN source for this right now. And we’ll eventually want to be able to just set up a position anyway, right? 

It doesn’t seem like a crucial piece of functionality right now, but chessboard.js has setting up the board built in, so then it’s just a question of importing it to the database (and having some way of retrieving it later on). So it seems like a good ratio of result to effort. 
## Display non-main lines
This is important as soon as we start working with multiple lines, just to be able to see what we’re doing. This is part of assembling lines from board input, as mentioned just above. 
Getting this working is also an important part of minimizing technical debt going forward. Right now the Game Handler is retrieving a list of moves for each line, and a first and last move index for the game as a whole. Going forward, each line needs to be a distinct object of a GameLine class that includes its own first and last move indices in addition to the actual moves, so that the front end knows what to draw and what the boundaries of navigation are. 

Displaying these meaningfully also requires that the list of moves in these GameLine objects has to include the unique Move ID values from the backend tables, because this is how the line branches are connected to their parent line. 