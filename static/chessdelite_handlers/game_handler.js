class MoveRef {
  // Private variables and utility function
  #move_number;
  #move_color;
  #movelist_header; 

  #unpack_move_ref(hot_index) {
    let hot_move_number = Number(hot_index.slice(0,-1));
    let hot_move_color = hot_index.slice(-1);
    return [hot_move_number, hot_move_color];
  }

  // Default value is for the pre-move to the initial position.
  // const keyword is not allowed in class definition, so using _C_.
  #_C_default_move_number = 0;
  #_C_default_move_color = "B";

  constructor(move_number, move_color) {
    try{
      this.#movelist_header = document.getElementById("movelist_header");
      if (move_number === undefined) {
        // The object is created without any parameters
        this.#move_number = this.#_C_default_move_number;
        this.#move_color = this.#_C_default_move_color;
      } else if (move_color === undefined) {
        /* The object was created from one index string, 
				like '14B', not a separate number and letter. */
        [this.#move_number, this.#move_color] = this.#unpack_move_ref(move_number);
      } else {
        this.#move_number = move_number;
        this.#move_color = move_color;
      }
    }
    catch (error) {
      alert("MoveRef constructor error: " + error);
    }
  }

  get number() {
    return this.#move_number;
  }
  set number(hot_number) {
    this.#move_number = hot_number;
  }

  get color() {
    return this.#move_color;
  }
  set color(hot_color) {
    this.#move_color = hot_color;
  }

  get index() {
    return this.#move_number + this.#move_color;
  }

  set index(hot_index) {
    try {
      [this.#move_number, this.#move_color] = this.#unpack_move_ref(hot_index);
    }
    catch (error) {
      alert("Set MoveRef index error: " + error);
    }
  }

  bump_index(bump = 0, new_index = '') {    
    // If we're explicitly given a new move index, just use it.
    if (new_index) {
      this.index = new_index;
    }
    // But if we're given a bump...
    else {
      /* We have to do math, so make sure the bump is
      an actual number:
      */
      bump = Number(bump);
      let actual_math_move_number = Number(this.#move_number); 
      // If the bump is even, just update the move number.
      if (bump % 2 == 0) {
        this.#move_number = actual_math_move_number + bump/2; 
      }
      else {
      // If the bump is odd, then switch colors and update the number.
        // First, the bump gets rounded down to one nearer to zero
        let inner_bump = (bump < 0) ? (bump+1)/2 : (bump-1)/2;  
        // and if the bump pushes us onto the next move, do so.
        if (bump > 0 && this.#move_color == "B") { 
          actual_math_move_number++;
        }
        if (bump < 0 && this.#move_color == "W") { 
          actual_math_move_number--;
        }
        this.#move_number = actual_math_move_number + inner_bump; 
        if (this.#move_color == "W") {  
          this.#move_color = "B"; 
        }
        else{
          this.#move_color = "W"; 
        }
      }
    }
  }
  
    move_diff(external_index) {
      /* Returns the external index's move number distance (positive or 
      negative) from the MoveRef's move number.
      */
      let external_move_number = this.#unpack_move_ref(external_index)[0];
      return this.#move_number - external_move_number;
    }
	
	is_later(external_move_ref) {
		/*
		Check if a full move index string (for example, "15W") occurs later 
		in the chess game than that of the MoveRef. The current use case 
		is in running through a list of moves to find the first or last move. 
		If the indices are the same, it will return True.
		*/
		try{
				let input_move_number, input_move_color;
				[input_move_number, input_move_color] = this.#unpack_move_ref(external_move_ref);
				// let input_move_number = external_move_ref.slice(-1);
				// let input_move_color = external_move_ref.slice(0, -2);
				if (input_move_number > this.#move_number){
						return true;
				}
				if ((input_move_number == this.#move_number) && (input_move_color == "B")){
						return true;
				}
				return false;
		}
		catch (error) {
			alert("is_later" + error);
		}
	}
}





  
class GameHandler {
    // Objects for storing moves and game info
    #game_key;
    #main_line_initial_move;
    #main_line_final_move;
    #current_line_initial_move;
    #current_line_final_move;					 
    #current_move;
    #line_list;
    #move_list;
		#breakout_dict;
		#column_lengths;
    // DOM objects for population
    #movelist_header;
    #movelist_footer;
    #game_notation_tbody;
    // Indices for getting information from the move_list object
    #MOVE_LIST_DISPLAY_NOTATION;
    #MOVE_LIST_FEN;
    #POSITION_ID;
		#GAME_MOVE_ID;
    #DEFAULT_ORIENTATION;
  
    constructor() {
      try{
        this.#game_key = 40; // This is the Fischer-Geller game. 
				/*   
					 Main line initial/final moves are used for layout of the breakout lines.
					 The main line layout stays fixed, so the breakout layout always needs
					 to accomodate it.
				*/
        this.#main_line_initial_move = new MoveRef();
        this.#main_line_final_move = new MoveRef();
				/* 
					 Current line initial/final moves are used for validating arrow-key
				   navigation @ whether we're trying to go off the beginning or end
					 of the active set of moves.
				*/
        this.#current_line_initial_move = new MoveRef();
        this.#current_line_final_move = new MoveRef();
				
        this.#current_move = new MoveRef();   
        this.#line_list = new Object;
        this.#move_list = new Object;
				this.#breakout_dict = new Object;
				this.#column_lengths = new Object;
        this.#movelist_header = document.getElementById("movelist_header");
        this.#movelist_footer = document.getElementById("movelist_footer");
        this.#game_notation_tbody = document.getElementById("game_notation_tbody");    
        this.#MOVE_LIST_DISPLAY_NOTATION = 0;
        this.#MOVE_LIST_FEN = 1;
        this.#POSITION_ID = 2;
        this.#GAME_MOVE_ID = 3;
        this.#DEFAULT_ORIENTATION = 'white';
      }
      catch (error) {
        alert("GameHandler initialization error: " + error);
      }
    }

/*--------- Load routines ------------*/

  load_game(game_key, stem_position_key) {
    try {
			let base_URL = '/retrieve_game?game_key=___dummy___&stem_position_key=___dummy2___';
			let position_URL = base_URL.replace('___dummy2___', stem_position_key);
			let hot_URL = position_URL.replace('___dummy___', game_key);
			// Remove the current game display
			this.#wipe_existing_game();
			// Preserve current object reference for fetch call, but doesn't
			// need to be anything fancy. :-) 
			let remote_this = this;
			fetch(hot_URL)
				.then((resp) => resp.json())
				.then(function (resp) {
					remote_this.#line_list = resp["game_contents"];
					remote_this.#move_list = remote_this.#line_list["0.0"];
					remote_this.#breakout_dict = resp["breakout_dict"];
					let game_meta_info = resp["game_meta_info"];
					remote_this.#main_line_initial_move.index = game_meta_info["first_move"];
					remote_this.#main_line_final_move.index = game_meta_info["last_move"];
					remote_this.#current_line_initial_move.index = game_meta_info["first_move"];
					remote_this.#current_line_final_move.index = game_meta_info["last_move"];
					remote_this.#current_move.index = game_meta_info["current_move"];
					remote_this.#movelist_header.innerHTML = game_meta_info["game_header_text"];
					remote_this.#movelist_footer.innerHTML = game_meta_info["game_footer_text"];
					remote_this.#populate_move_display();
					remote_this.jump_to_move(remote_this.#current_move.index); 
				}
			)
      .catch(function(error) {
        alert("load_game Fetch error: " + error);
      });
      display_mode = cGameMode; 
      Main_Board.orientation(this.#DEFAULT_ORIENTATION);
      this.#game_key = game_key;
    }
    catch(error) {
      alert("load_game Regular error: " + error);
    }
  }

/*--------- Utilities ------------*/

  #create_combo_move_index(move_index, line_number = '0.0') {
		let return_index = '';
		if (line_number == '0.0') {
			return_index = move_index;
		} else {
			return_index = line_number + '_' + move_index;
		}
		return return_index;
	}
	
	#get_current_line_number() {
		return this.#move_list["line_ID"];
	}
	
  #update_highlight(old_cell_index) {
    /* This routine removes the highlight from the previously
    highlighted cell, and sets the highlight to the new cell.
    It assumes that the new move is the game_handler's current_move.
  */
    let new_move_index = this.#create_combo_move_index(this.#current_move.index, this.#get_current_line_number()); 	
		let old_cell = document.getElementById(old_cell_index);
    let new_cell = document.getElementById(new_move_index);
    /* We have to test if the cells in question exist, because the
    pre-move doesn't have a cell in the DOM. Trying to set 
    its highlight throws an error and the rest of the routine
    doesn't run. 
    */
    try {
      if (old_cell) {
        old_cell.classList.remove("highlight");
      } 
      if (new_cell) {
        new_cell.classList.add("highlight");
      } else {
        /* If there's no cell for the current move (because it's set
        to the pre-move position), scroll to the move just after it.
        We don't need to do any fancy next-move figuring out, because
        we're not highlighting it, just scrolling it into view.
        */
        let first_display_move_number = this.#current_move.number + 1;
        new_cell = document.getElementById(first_display_move_number + "W");
      }
      new_cell.scrollIntoView({behavior: "smooth", block: "nearest"});
    }
    catch (error) {
    alert("update_highlight" + error);
    }
  }


  #update_current_move(bump = 0, new_index = '', old_line_number) {
    /* Does the work of changing the onscreen move list when we go 
    to a certain move.
    
    I am keeping the arguments for this positional so I don't have to
    work with one variable and then check if it's numeric. 
    I am only calling it from the functions bump_move and jump_to_move --
    they each are meaningfully named and only take one variable that they
    then use in the correct parameter list for this function.
    */
    if ((!bump) && (!new_index)) {
      return;
    }	
    // First capture old index to switch highlighting.
    let old_cell_index = this.#create_combo_move_index(this.#current_move.index, old_line_number);	
		// Make sure we have the line number
		if (! old_line_number) {
			old_line_number = this.#get_current_line_number();
		}
		/* Update the current move's index.
    This has to be done before changing the highlighting,
    as the highlighting routine uses the current index value. */ 
    this.#current_move.bump_index(bump, new_index);
    // Update the highlighted cell in the move list.
    this.#update_highlight(old_cell_index);
  }


  bump_move(bump_step) {
    // First, validate
    if (bump_step > 0 &&
      this.#current_move.index == this.#current_line_final_move.index)
    {
      alert("You're already on the last move!")
      return;
    }
    if (bump_step < 0 &&
      this.#current_move.index == this.#current_line_initial_move.index)
    {
      alert("You're already on the first move!")
      return;
    }
    // then, execute
    try {
			let current_line_number = this.#get_current_line_number();
      this.#update_current_move(bump_step, '', current_line_number); 
      this.#set_board_position();
    } 
    catch (error) {
      alert("bump_move error: " + error);
    }
  }

  jump_to_move(hot_move, line_id = '0.0') {
    /* This is the  externally exposed wrapper for update_current_move 
		and set_board_position, for use by the interface. */
		let old_line_number = this.#get_current_line_number();
		if (line_id != this.#get_current_line_number()) {
			this.#move_list = this.#line_list[line_id];
			[this.#current_line_initial_move, this.#current_line_final_move] = this.#get_line_first_last_move_indices(line_id);
		}
    this.#update_current_move(0, hot_move, old_line_number); 
    this.#set_board_position();
  }

  #wipe_existing_game() {
    // Delete existing lines.
    for (let key in this.#line_list) {
      delete this.#line_list[key];
    } 
    movelist_header.innerHTML = '';
    movelist_footer.innerHTML = ''; 
    // Remove the existing rows of the move list.
    while (this.#game_notation_tbody.firstChild) {
      this.#game_notation_tbody.removeChild(this.#game_notation_tbody.firstChild);
    }
  }

  go_first() {
    this.jump_to_move(this.#current_line_initial_move.index, this.#get_current_line_number()); 
  }

  go_last() {
    this.jump_to_move(this.#current_line_final_move.index, this.#get_current_line_number());
  }

/*--------- Board and GameMoves ------------*/
 
  #populate_move_display() {
    try {
      let first_move_number = this.#main_line_initial_move.number;
      let first_move_color = this.#main_line_initial_move.color;
			// ******** Board orientation and possible dummy first White move  ***********
			
      /* populate_move_display is designed to start from a pre-move position,
      which is the OPPOSITE color of the move orientation for the user.
			The pre-move entry in the move_list has a position but no move notation. 
			If White has the first (real) move, the pre-move is 0 (or something else
			that we don't want to actually show) so the first move in the notation 
			list has to be first_move_number + 1. 
      */
      if (first_move_color == "B") {
        first_move_number++;
				Main_Board.orientation("white");
      } else {
				Main_Board.orientation("black");
			}
      let final_move_number = this.#main_line_final_move.number; 
			let white_move_index;
			let black_move_index;
			let white_move_notation;
			let black_move_notation;
			let function_name;
			let main_cell_text;
			let sideline_text = "";
			let game_move_index;
      for (let move_step = first_move_number; move_step <= final_move_number; move_step++) {
        // Insert move-number column
        let hotRow = this.#game_notation_tbody.insertRow(-1);
        let newCell = hotRow.insertCell(0);
        newCell.id =  move_step + "number";
        newCell.innerHTML = '<span class="chessmovenumber"> ' 
            + move_step + '. </span>';																				 
        // Insert white move (if any)
        white_move_index = move_step + "W";
				newCell = hotRow.insertCell(1);
				newCell.id = white_move_index;
        /* Because of the pre-move bump forward (see the Board  
				Orientation comment above), there will always be an *index* 
        for a white move for the first move number; what we have to test 
        for here is whether there's actually some move notation 
        associated with that index, or whether it's the pre-move position, 
				in which case we insert dummy notation. 
        */
        if (this.#move_list[white_move_index][this.#MOVE_LIST_DISPLAY_NOTATION]) {
          // Create move notation link to set the board to this position.
					white_move_notation = this.#move_list[white_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
					game_move_index = this.#move_list[white_move_index][this.#GAME_MOVE_ID];
					main_cell_text = this.#write_main_move_text(white_move_index, white_move_notation);
					newCell.innerHTML = main_cell_text + sideline_text;
					sideline_text = game_move_index in this.#breakout_dict ? 
						this.#write_sideline_links(game_move_index) : "";
        } else {
					// Dummy notation for blank premove
					newCell.innerHTML = '-';
				}
        // Insert black move (if any)
        black_move_index = move_step + "B";
        /* Here, on the other hand, we test if there's an *index* 
        for a black move for the current move number.
        */
        if (this.#move_list.hasOwnProperty(black_move_index)) {
          black_move_notation = this.#move_list[black_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
          newCell = hotRow.insertCell(2);
          newCell.id = black_move_index;
          if (black_move_notation) {
						game_move_index = this.#move_list[black_move_index][this.#GAME_MOVE_ID];
						main_cell_text = this.#write_main_move_text(black_move_index, black_move_notation);
						newCell.innerHTML = main_cell_text + sideline_text;
						sideline_text = game_move_index in this.#breakout_dict ? 
							this.#write_sideline_links(game_move_index) : "";
          }
        }
      }
    }
    catch(error) {
      alert("internal populate_move_display: " + error);
    }  
  }
	
	#write_main_move_text (move_index, move_notation) {
		let hot_link_text = '<span class="chessmove" onclick="' + 
		"game_handler.jump_to_move('" + move_index + "')" + 
		';">' + move_notation + '</span>';
		return hot_link_text;
	}
	
	#write_sideline_links (line_id_parent) {
		/* The breakout dict has lines grouped first under the Parent node 
		(here, line_id_parent). Under that, it has numerical indices 1, 2, 3...
		for the different sidelines coming off of that move node. Under each
		index is the LAN move notation.
		So the full, unique Line Index (for use in the Line List) can be recon-
		structed by concatenating the Line Parent with the Subline Index, and 
		the notation is used as the display text.
		*/
		// Write the beginning of the select element tag
		let link_text = '<select name="breakout' + line_id_parent + '" id="breakout' + 
			line_id_parent + '" class = "chess_select" onChange="game_handler.add_column(this.value, this.id);">' +
			'<option value="">♞</option>';  // ♞  ♔
		let hot_dict = this.#breakout_dict[line_id_parent];
		// Write the individual options.
		for (const [subline_index, sideline_move_notation] of Object.entries(hot_dict)) {			
			let local_link_text = '<option value="' + line_id_parent + "." + subline_index + '">' +
				sideline_move_notation + '</option>';
			link_text = link_text.concat(local_link_text, " ");
		}
		link_text = link_text.concat(`
		</select>`);
		return link_text;
	}

	#set_board_position(move_index = '', line_id = "0.0") {
			/* move_index is something like "1W" or "5B", and is a key
			in the move_list dictionary. */

			/* By default, if no move index is provided, this
			routine uses the current move index. */
			if (!move_index) {
					move_index = this.#current_move.index; 
			}
			// Okay, do the work!
			try {
					// Set the main board position and clear the move display box
					// First, set the current fen (front-end global variable)
					current_FEN = this.#move_list[move_index][this.#MOVE_LIST_FEN];
					Main_Board.position(current_FEN);
			}
					catch (error) {
					alert("set_board_position" + error);
			}
	}
	
	/*--------- Breakout moves ------------*/
	
	yeet(column_level = 1) {
		let max_column_depth = column_level * 2 + 1;
		let last_main_line_move_number = this.#main_line_final_move.number;
		
		// First, delete all complete rows past the last move of the main line
		while (this.#game_notation_tbody.rows[last_main_line_move_number]) {
			this.#game_notation_tbody.deleteRow(-1);
		}											 
		
		/* The assignment as condition here is a neat little trick. 
		I assume that once we go off the end of the table, 
		hot_row = this.#game_notation_tbody.rows[i]
		fails, and this returns a falsy value and kicks us out of
		the loop, without ever needing to know exactly how many rows
		are in the table.
		*/
		for (let i = 0, hot_row; hot_row = this.#game_notation_tbody.rows[i]; i++) {
			while (hot_row.cells[max_column_depth]) {
				hot_row.deleteCell(max_column_depth);
			}
		}
	}
	
	add_column(line_id, hot_control_id, column_depth = 1) {
		let test_move_ref = new MoveRef();
		let first_new_move_ref = new MoveRef();
		let last_new_move_ref = new MoveRef();
		let hotRow;
		let hotCell;
		let white_move_index = '';
		let white_move_notation = '';
		let black_move_index = '';
		let black_move_notation = '';
			
		try{
			/* 
			Set the dropdown that called this function back to 
			having no value, so that it will trigger onChange the 
			next time the user pulls it down.
			*/
			let hot_control = document.getElementById(hot_control_id);
			hot_control.value = "";
			// First, erase existing columns to this depth
			this.yeet(column_depth);
			
			// Let's get the first and last move numbers in the line:
			[first_new_move_ref, last_new_move_ref] = this.#get_line_first_last_move_indices(line_id);
			let first_new_move_number = first_new_move_ref.number;
			
			/* 
				Now we have the first and last moves of the sideline.
				Let's initialize the other variables.
			*/
			let last_main_line_move_number = this.#main_line_final_move.number;
			// The initial_move is the premove
			let first_mainline_move_is_white = this.#main_line_initial_move.color == "B";
			let first_main_line_move_number = this.#main_line_initial_move.number;
			let hot_line = this.#line_list[line_id];
			
			/*
				If the last move in the main line is a white move,
				fill in a dummy black cell for that line, IF it's
				not already present :-) .
			*/
			hotRow = this.#game_notation_tbody.rows.item(this.#game_notation_tbody.rows.length - 1);
			hotCell = hotRow.cells[2];
			if (! hotCell) {
				hotCell = hotRow.insertCell(-1);
				hotCell.innerHTML = '-';
			}
			
			/* Create the spacer 'yeet' cell above the new column
					unless the new column starts on the first move:
			*/
			if (first_new_move_ref.number > 1) {
				hotCell = this.#game_notation_tbody.rows[0].insertCell();
				let hot_rowSpan = first_new_move_ref.number - first_main_line_move_number;
				if (first_mainline_move_is_white) {
					hot_rowSpan--;
				}
				hotCell.rowSpan = hot_rowSpan;
				hotCell.colSpan = 2;
				hotCell.style.verticalAlign = "bottom";
				hotCell.style.textAlign = "center";
				hotCell.innerHTML = this.#yeet_button();
			}
		
			/* Add a spacer cell below the main line if there are more
			more moves in the line we're adding than in the main line.
			*/
			if (last_new_move_ref.number > last_main_line_move_number) {
				/* We have more moves in the sideline than in the main 
				line, so write in the new move numbers and create
				space for them.
				*/
			  for (let move_step = last_main_line_move_number + 1; move_step <= last_new_move_ref.number; move_step++) {
        // Insert move-number column
        hotRow = this.#game_notation_tbody.insertRow(-1);
        hotCell = hotRow.insertCell(0);
        hotCell.id =  move_step + "number";
        hotCell.innerHTML = '<span class="chessmovenumber"> ' 
            + move_step + '. </span>'
				}
				hotCell = this.#game_notation_tbody.rows[last_main_line_move_number].insertCell(1);
				hotCell.rowSpan = last_new_move_ref.number - last_main_line_move_number + 1;
				hotCell.colSpan = 2;
			}
			
			/*  End of adding spacer cell below main line moves.
				Now, add the breakout moves for the sideline.
			*/
			for (let move_step = (first_new_move_number); move_step <= last_new_move_ref.number; move_step++) {
				/* Moves are index starting at one. Rows are indexed starting at 
				zero, so we have to subtract one from the move number to get the
				correct row number.
				*/
				hotRow = this.#game_notation_tbody.rows[move_step - 1]; 
				white_move_index = move_step + "W";
				hotCell = hotRow.insertCell();
				hotCell.id = this.#create_combo_move_index(white_move_index, line_id); 
				if (hot_line.hasOwnProperty(white_move_index)) {
					white_move_notation = hot_line[white_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
					let function_name = "game_handler.jump_to_move('" + white_move_index + "', '"  + line_id + "')";
					hotCell.innerHTML = '<span class="chessmove" onclick="' 
						+ function_name + ';">' +  white_move_notation + '</span>';
				} else {
					// No White notation, so we just put in a spacer character.
					hotCell.innerHTML = '-';	
				}
				// Insert black move (if any)
				black_move_index = move_step + "B";
				if (hot_line.hasOwnProperty(black_move_index)) {
					black_move_notation = hot_line[black_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
					hotCell = hotRow.insertCell();
					hotCell.id = this.#create_combo_move_index(black_move_index, line_id);
					if (black_move_notation) {
						let function_name = "game_handler.jump_to_move('" + black_move_index + "', '" + line_id + "')";
						hotCell.innerHTML = '<span class="chessmove" onclick="' 
							+ function_name + ';">' +  black_move_notation + '</span>';
					}
				}
			} 
			/*
					Now that we've written the moves, let's jump to 
					the first one in the newly displayed line.
			*/
			this.jump_to_move(first_new_move_ref.index, line_id);
		}		// try closing bracket
    catch (error) {
      alert("add_column " + error);
    }
	}
	
	#yeet_button (column_depth = 1) {
		let yeet_button_text = `
				<button class="yeetbutton" id="yeet` + column_depth + `"
						type="button" onclick="game_handler.yeet();"> 
					Yeet
				</button>`;
		return yeet_button_text;
	}
	
	#get_line_first_last_move_indices(line_id) {
		let first_new_move_ref = new MoveRef();
		let last_new_move_ref = new MoveRef();
		let key_array = Object.keys(this.#line_list[line_id]);
		first_new_move_ref.index = key_array[0];
		last_new_move_ref.index = key_array[0];
		key_array.forEach(function (item) {
			if (item == "line_ID") {
				// This branch intentially left blank.
			} else {
				if (!first_new_move_ref.is_later(item)) {
					first_new_move_ref.index = item;
				}
				if (last_new_move_ref.is_later(item)) {
					last_new_move_ref.index = item;
				}
			}
		}) // Parenthesis is forEach (function	
	return [first_new_move_ref, last_new_move_ref];
	}

}  