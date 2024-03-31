from flask import Flask, g, jsonify, render_template, request, make_response
import sqlite3
import chess

app = Flask(__name__)

utilityboard = chess.Board()
DATABASE = 'chessdelite.db'

# Game types
cNormalGame = 1
cOpeningTree = 2
cDiagram = 3

# Game meta-info indices
cGameHeader = 0
cGameFooter = 1
cOneLineGameInfo = True

# Default game (to load on startup)
cROOT_OPENINGS_KEY = -1
# Next two defaults are the Fischer-Geller game.
#cDEF_GAME_KEY = 40
#cDEF_POSITION_KEY = 10
# Load Chandra-Novikov position instead
cDEF_GAME_KEY = 45
cDEF_POSITION_KEY =  3159  
                      
cDEF_MOVE_REF_INDEX = "0B"
cDEF_STARTING_POSITION = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

'''  Database connection and teardown   '''

def get_db():
    db_connection = getattr(g, '_database', None)
    if db_connection is None:
        db_connection = g._database = sqlite3.connect(DATABASE)
    return db_connection

@app.teardown_appcontext
def close_connection(exception):
    db_connection = getattr(g, '_database', None)
    if db_connection is not None:
        db_connection.close()

'''  MoveRef class definition  '''

class MoveRef:
    # Default values for setting the pre-move to the initial position.
    # These constants are for all instances so they go before the __init__.
    _C_default_move_number = 0
    _C_default_move_color = "B"
    _C_default_line = "0.0"

    def __unpack_move_ref(self, hot_index) :
        hot_move_number = int(hot_index[0:-1])
        hot_move_color = hot_index[-1]
        return (hot_move_number, hot_move_color)

    def __init__(self, move_number = 0, move_color = ''):
        self.move_number = self._C_default_move_number
        self.move_color = self._C_default_move_color
        if (not move_number):
            ''' Object is created without parameters.
            Just let the defaults pass on through.'''
            pass
        elif (not move_color):
            # Object is created from one index string, like '14B'
            self.move_number, self.move_color = self.__unpack_move_ref(move_number)
        else:
            self.move_number = move_number
            self.move_color = move_color
            
    def get_index(self):
        return str(self.move_number) + self.move_color

    def set_index(self, hot_index):
        [self.move_number, self.move_color] = self.__unpack_move_ref(hot_index)

    def is_later(self, input_move:str)->bool:
        '''Check if a full move index (for example, "15W") occurs later 
        in the chess game than that of the MoveRef. The current use case 
        is in running through a list of moves from the database to find
        the last move; so it assumes the index is well-formed and there 
        are no duplicates, though duplicates wouldn't harm this particular usage. '''
        try:
            input_move_number, input_move_color = self.__unpack_move_ref(input_move)
            if int(input_move_number) > int(self.move_number):
                return True
            if (int(input_move_number) == int(self.move_number)) and (input_move_color == "B"):
                return True
            return False
        except (ValueError, TypeError):
            return None

    def increment(self):
        if self.move_color == "B":
            self.move_color = "W"
            self.move_number = self.move_number + 1
        else:
            self.move_color = "B"
        return str(self.move_number) + self.move_color

    def decrement(self):
        if self.move_color == "B":
            self.move_color = "W"
        else:
            self.move_color = "B"
            self.move_number = self.move_number - 1
        return str(self.move_number) + self.move_color


'''  Chess utilities   '''

def get_player_name(raw_name: str) -> str:
    comma_index = raw_name.find(",")
    if comma_index < 0:
        return raw_name
    else:
        '''  Will give the option of providing full name at some point,
        but for now it takes up too much space in the interface.  '''
        # return raw_name[comma_index + 1:] + " " + raw_name[:comma_index]
        return raw_name[:comma_index]

def join_FEN_fields(FEN_fields: list)->str:
    fen_string = '/'.join(FEN_fields)
    return fen_string
   
def make_complete_fen(FEN_rows: list, whose_move: str, castling_privileges: str) ->str:
    complete_FEN = join_FEN_fields(FEN_rows) + " " + whose_move + " " + castling_privileges
    return complete_FEN
         
def create_line_index(line_parent:int, subline_index: int)->str:
    '''Implements a standard way of denoting a unique line in the chess game.'''             
    return str(line_parent) + "." + str(subline_index) 
    
def get_chess_fields(original_fen, uci_move):
    utilityboard.set_fen(original_fen)
    hot_move = chess.Move.from_uci(uci_move)
    # short_algebraic_notation = utilityboard.san(hot_move)
    long_algebraic_notation = utilityboard.lan(hot_move)
    utilityboard.push(hot_move)
    new_fen = utilityboard.fen()
    legal_move_list = [utilityboard.uci(hot_move) for hot_move in utilityboard.legal_moves]
    return long_algebraic_notation, new_fen, legal_move_list
    
def get_game_info(game_key: int, one_liner = False) -> tuple:
    '''Assembles a header text for the game, and if the game is a
    real game, finds and returns the result.'''

    ''' If the game header is for the list of moves, the player names
    get bolded and placed on a separate line.
    One-liners are for the list of games matching the chosen opening
    (displayed below the panel of opening thumbnail diagrams) and also
    includes the result. 
    '''
    if one_liner:
        item_separator = " "
        name_bolder = '<b>'
        name_unbolder = '</b>'
    else:
        item_separator = "<br>"
        name_bolder = ''
        name_unbolder = ''
    chess_db = get_db().cursor()
    chess_db.execute("SELECT GameSourceType FROM 'Games' WHERE GameKey = " + str(game_key))
    game_type = chess_db.fetchone()[0]
    if game_type == cNormalGame or game_type == cDiagram:
        chess_db.execute("SELECT StubHeaderField, StubHeaderValue FROM 'Gamestubs' WHERE StubGameKey = " + str(game_key))
        header_dict = {stub[0]: stub[1] for stub in chess_db.fetchall()}
        white_name = get_player_name(header_dict["White"])
        black_name = get_player_name(header_dict["Black"])
        players_string = name_bolder + white_name + " - " + black_name + name_unbolder
        game_date = header_dict["Date"][:4]
        game_site = header_dict["Site"] + ", " if header_dict["Site"] else ''
        game_event = ''
        if ("Round" in header_dict) and ("?" not in header_dict["Round"]):
            game_event = "Round " + header_dict["Round"]
        if  (header_dict["Event"]) and ("?" not in header_dict["Event"]) and \
        (header_dict["Event"] != header_dict["Site"]):
            game_event = header_dict["Event"] + ', ' + game_event \
            if game_event else header_dict["Event"]
        if game_event:
            game_event =  item_separator + "(" + game_event + ")"
        header_string = (players_string + item_separator + 
            game_site + game_date + game_event)
        game_result = header_dict["Result"]
        if one_liner:
            header_string = header_string + ' <b>' + game_result + '</b>'
        return (header_string, game_result)
    elif game_type == cOpeningTree:
        chess_db.execute('''SELECT NodeName FROM Moves 
        INNER JOIN OpeningNodes ON Moves.PositionTo = OpeningNodes.NodePositionKey
        WHERE MoveGame = ''' + str(game_key) + ' AND NodeIsRoot = 1')
        header_string = chess_db.fetchone()[0]
        # Perhaps at some point the footer text in this branch will
        # return evaluation (or other) information about the opening line. 
        return header_string, '*'

def get_opening_node_position(opening_node_key: int) -> int:
    chess_db = get_db().cursor()
    chess_db.execute("""SELECT NodePositionKey FROM OpeningNodes 
    WHERE NodeKey = """ + str(opening_node_key))
    return chess_db.fetchone()[0]

def get_games_matching_this_position(position_key: int) -> dict:
    chess_db = get_db().cursor()
    #  1 is the initial position
    if position_key <= 1:
        return {}
    new_sql = """SELECT MoveGame FROM GameMoves INNER JOIN PureMoves 
    ON GameMoves.GameMovePureMove = PureMoves.PureMoveKey 
    INNER JOIN Games ON GameMoves.MoveGame = Games.GameKey
    WHERE PureMoves.PositionTo = """ + str(position_key) + " AND GameSourceType = 1"
    chess_db.execute(new_sql)
    game_info_dict = {move_row[0]: get_game_info(move_row[0], cOneLineGameInfo)[cGameHeader] for move_row in chess_db.fetchall()}
    return game_info_dict

def get_game_moves(game_key: int, stem_position: int) -> tuple:
    if game_key < 0:
        game_key = cDEF_GAME_KEY
        stem_position = cDEF_POSITION_KEY
    game_dict = {}
    breakout_dict = {}
    chess_db = get_db().cursor()
    new_sql = """SELECT GameMoveKey, MoveNumber, WhoseMoveWasThis, SquareFrom, SquareTo, LineParent, 
        SublineIndex, PositionRank8, PositionRank7, PositionRank6, PositionRank5, PositionRank4, 
        PositionRank3,  PositionRank2, PositionRank1, PositionWhoseMove, PositionCastlingPrivileges, 
        PositionTo, MovePromotionPiece, PureMoveKey, PositionTo
          FROM (GameMoves INNER JOIN PureMoves ON GameMoves.GameMovePureMove = PureMoves.PureMoveKey)
          INNER JOIN Positions ON PureMoves.PositionFrom = Positions.PositionKey
          WHERE MoveGame = """ + str(game_key)
    chess_db.execute(new_sql)
    resultset = chess_db.fetchall()
    last_move_ref = MoveRef()
    current_move_ref = MoveRef()
    # Add that pre-move position, which has no move (or Move ID),  
    # just the position from before the first move. (The retrieved
    # recordset has only the position_from for each move.)                            
    first_rec = resultset[0]
    move_number = first_rec[1]
    whose_move = "W" if (first_rec[2] == "w") else "B"
    first_move_ref = MoveRef(move_number, whose_move)
    first_move_ref.decrement()
    empty_legal_move_list = []
    empty_move_uci = ''
    position_key = 1
    complete_FEN = make_complete_fen(first_rec[7:15], first_rec[15], first_rec[16])
    game_dict['0.0'] = {first_move_ref.get_index(): [empty_move_uci, 
        complete_FEN, position_key], "line_ID": '0.0'}
    # Get the rest of the rows
    for move_row in resultset:
        # Now that the pre-move is done, info for the actual moves

        # game_move_key will be used to bring over the Move ID of a move
        # from its table, for use in constructing secondary lines.
        game_move_key = move_row[0]
        move_number = move_row[1]
        whose_move = "W" if (move_row[2] == "w") else "B"
        game_dict_move_key  = str(move_number) + whose_move

        # Check if this is the stem position
        if (move_row[17] == stem_position):
            current_move_ref.set_index(game_dict_move_key)

        # Get the actual move and FEN info
        # Concatenate the From and To squares:
        move_uci = move_row[3] + move_row[4]
        # Add the promotion piece if there is one:
        if move_row[18]:
            move_uci = move_uci + move_row[18]
        complete_FEN = make_complete_fen(move_row[7:15], move_row[15], move_row[16])
        # Get the notation and the FEN for the position that results from this move
        long_algebraic_notation, move_fen, _ = get_chess_fields(complete_FEN, move_uci)
        
        # Get the Position Key, which will be used to generate the list of replies to this move.
        position_key = move_row[20]
        
        # Info for what line this move is in
        line_parent = move_row[5]
        subline_index = move_row[6]
        line_index = create_line_index(line_parent, subline_index)
        
        # Update the last move index for displaying the main line
        if line_index == '0.0' and last_move_ref.is_later(game_dict_move_key):
            last_move_ref.set_index(game_dict_move_key)

        # Create the dictionary entry: first the line and then the moves for that line
        if line_index not in game_dict:
            game_dict[line_index] = {"line_ID": line_index}
            if line_parent not in breakout_dict:
                breakout_dict[line_parent] = {subline_index: long_algebraic_notation}
            else:
                breakout_dict[line_parent][subline_index] = long_algebraic_notation
        game_dict[line_index][game_dict_move_key] = [long_algebraic_notation, move_fen, 
                  position_key, game_move_key]
    # If we haven't updated the current move index, use the first move index
    if (current_move_ref.get_index() == cDEF_MOVE_REF_INDEX):
        current_move_ref.set_index(first_move_ref.get_index())
    return (game_dict, breakout_dict, first_move_ref.get_index(), last_move_ref.get_index(), 
        current_move_ref.get_index())

def get_complete_game_info(game_key: int, stem_position: int) ->tuple:
    game_contents, breakout_dict, first_move, last_move, current_move = get_game_moves(game_key, stem_position)
    game_header, game_footer = get_game_info(game_key)
    game_meta_info = {"first_move": first_move, "last_move": last_move,
    "current_move": current_move, "game_header_text": game_header, 
    "game_footer_text": game_footer, "game_key": game_key}
    return game_contents, breakout_dict, game_meta_info

def get_opening_info(hot_node: int) -> tuple:
    chess_db = get_db().cursor()
    # First, get the list of opening info.
    opening_list = []
    hot_sql = ''
    int_node = cROOT_OPENINGS_KEY
    # Attempt to get an integer node key out of the hot_node
    # parameter; otherwise just use cROOT_OPENINGS_KEY.
    try:
        int_node = int(hot_node)
    except:
        pass
    if int_node == cROOT_OPENINGS_KEY:
        hot_sql = """SELECT * from OpeningNodes INNER JOIN Positions 
            ON OpeningNodes.NodePositionKey = Positions.PositionKey
            WHERE OpeningNodes.NodeIsRoot = TRUE"""
    else:
        hot_sql = """SELECT * from OpeningNodes INNER JOIN Positions 
            ON OpeningNodes.NodePositionKey = Positions.PositionKey
            WHERE OpeningNodes.NodeParentNode = """ + str(hot_node)
    chess_db.execute(hot_sql)
    opening_list = [{"node_key": move_row[0], "name": move_row[1], "abbrev": move_row[2], 
        "position": join_FEN_fields(move_row[8:16]) } 
        for move_row in chess_db.fetchall()]
    '''And while we've got the g.db instantiated, lets also
    grab the header for the table of openings.'''
    # The header starts out as "Root Openings"; it gets 
    # changed if there's a real opening.
    header_text = "Root Openings"
    if int_node > cROOT_OPENINGS_KEY:
        header_sql = """SELECT NodeName from OpeningNodes 
        WHERE NodeKey = """ + str(int_node)
        chess_db.execute(header_sql)
        header_text = chess_db.fetchone()[0]
    return (header_text, opening_list)

@app.route('/retrieve_opening_game_info/<opening_node_key>')
def retrieve_opening_game_info(opening_node_key):
    stem_position_key = get_opening_node_position(opening_node_key)
    related_game_dict = get_games_matching_this_position(stem_position_key)
    first_game_key = list(related_game_dict)[0] if related_game_dict else cROOT_OPENINGS_KEY
    master_dict = {"game_list": related_game_dict, "hot_game": first_game_key,
    "stem_position_key": stem_position_key}
    return jsonify(master_dict)

@app.route('/retrieve_game/')
def retrieve_game():
    game_key = request.args.get('game_key', cDEF_GAME_KEY, type=int)
    stem_position_key = request.args.get('stem_position_key', cDEF_POSITION_KEY, type=int)
    game_contents, breakout_dict, game_meta_info = get_complete_game_info(game_key, stem_position_key)
    master_dict = {"game_contents": game_contents, "breakout_dict": breakout_dict,
        "game_meta_info": game_meta_info}
    return jsonify(master_dict)

@app.route('/get_openings/<opening_root>')
def get_openings(opening_root):
    opening_header_text, opening_dicts = get_opening_info(opening_root)
    return jsonify(opening_dicts = opening_dicts, 
        opening_header_text = opening_header_text)

@app.route('/')
def index():
    return render_template('crsn.html')