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
    #_C_default_line = "0.0";
  
    constructor(move_number, move_color) {
      try{
        this.#movelist_header = document.getElementById("movelist_header");
        if (move_number === undefined) {
          // Object is created without parameters
          this.#move_number = this.#_C_default_move_number;
          this.#move_color = this.#_C_default_move_color;
        } else if (move_color === undefined) {
          // Object is created from one index string, like '14B'
          [this.#move_number, this.#move_color] = this.#unpack_move_ref(move_number);
        } else {
          this.#move_number = move_number;
          this.#move_color = move_color;
        }
      }
      catch (error) {
        alert(error);
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
        alert(error);
      }
    }
  
    move_diff(external_index) {
      /* Returns the external index's move number distance (positive or 
      negative) from the MoveRef's move number.
      */
      let external_move_number = this.#unpack_move_ref(external_index)[0];
      return this.#move_number - external_move_number;
    }
  }
  
  
class GameHandler {
    // Objects for storing moves and game info
    #final_move;
    #initial_move;
    #current_move;
    #line_list;
    #move_list;
    // DOM objects for population
    #movelist_header;
    #movelist_footer;
    #game_notation_tbody;
    // Indices for getting information from the move_list object
    #MOVE_LIST_DISPLAY_NOTATION;
    #MOVE_LIST_FEN;
  
    constructor() {
      try{
        this.#final_move = new MoveRef();
        this.#initial_move = new MoveRef();
        this.#current_move = new MoveRef();   
        this.#line_list = new Object;
        this.#move_list = new Object;
        this.#movelist_header = document.getElementById("movelist_header");
        this.#movelist_footer = document.getElementById("movelist_footer");
        this.#game_notation_tbody = document.getElementById("game_notation_tbody");
        this.#MOVE_LIST_DISPLAY_NOTATION = 0;
        this.#MOVE_LIST_FEN = 1;
      }
      catch (error) {
        alert(error);
      }
    }


    #set_board_position(move_index = '') {
        /* move_index is something like "1W" or "5B", and is a key
        in the move_list dictionary. */

        /* By default, if no move index is provided, this
        routine uses the current move index. */
        if (!move_index) {
            move_index = this.#current_move.index; 
        }
        // Okay, do the work!
        try {
            let fen_string = this.#move_list[move_index][this.#MOVE_LIST_FEN];
            Main_Board.position(fen_string);
        }
            catch (error) {
            alert(error);
        }
    }
    
    

  #update_highlight(old_move_index) {
    /* This routine removes the highlight from the previously
    highlighted cell, and sets the highlight to the new cell.
    It assumes that the new move is the game_handler's current_move.
  */
    let new_move_index = this.#current_move.index; 
    let old_cell = document.getElementById(old_move_index);
    let new_cell = document.getElementById(new_move_index);
    /* We have to test if the cells in question exist, because the
    pre-move doesn't have a cell in the DOM. Trying to set 
    its highlight throws an error and the rest of the routine
    doesn't run. 
    */
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



  #update_current_move_index(bump = 0, new_index = '') {
    /* Does the work of changing the DOM display when we go to 
    a certain move
    
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
    let old_move_index = this.#current_move.index;
    // If we're explicitly given a new move index, just use it.
    if (new_index) {
      this.#current_move.index = new_index;
    }
    // But if we're given a bump...
    else {
      /* We have to do math, so make sure both indices are
      actual numbers:
      */
      bump = Number(bump);
      let actual_math_move_number = Number(this.#current_move.number); 
      // If the bump is even, just update the move number.
      if (bump % 2 == 0) {
        this.#current_move.number = actual_math_move_number + bump/2; 
      }
      else {
      // If the bump is odd, then switch colors and update the number.
        // First, the bump gets rounded down to one nearer to zero
        let inner_bump = (bump < 0) ? (bump+1)/2 : (bump-1)/2;  
        // and if the bump pushes us onto the next move, do so.
        if (bump > 0 && this.#current_move.color == "B") { 
          actual_math_move_number++;
        }
        if (bump < 0 && this.#current_move.color == "W") { 
          actual_math_move_number--;
        }
        this.#current_move.number = actual_math_move_number + inner_bump; 
        if (this.#current_move.color == "W") {  
          this.#current_move.color = "B"; 
        }
        else{
          this.#current_move.color = "W"; 
        }
      }
    }
    // Update the highlighted cell in the move list.
    this.#update_highlight(old_move_index);
  }

  

  bump_move(bump_step) {
    if (bump_step > 0 &&
      this.#current_move.index  == this.#final_move.index)
    {
      alert("You're already on the last move!")
      return;
    }
    if (bump_step < 0 &&
      this.#current_move.index == this.#initial_move.index)
    {
      alert("You're already on the first move!")
      return;
    }
    try {
      this.#update_current_move_index(bump_step); 
      this.#set_board_position();
    } 
    catch (error) {
      alert(error);
    }
  }



  jump_to_move(hot_move) {
    // Kind of just a sugar wrapper for update_current_move_index.
    this.#update_current_move_index(0, hot_move); 
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
    this.jump_to_move(this.#initial_move.index); 
  }

  go_last() {
    this.jump_to_move(this.#final_move.index);
  }

    
  #populate_move_display() {
    try {
      let first_move_number = this.#initial_move.number;
      let first_move_color = this.#initial_move.color;
      /* Routine is designed to start from a pre-move position,
      which has a position but no moves. If that position resulted 
      from a move by Black, the first move will be by White, on
      the move number following it.
      */
      if (first_move_color == "B") {
        first_move_number++;
      }
      let final_move_number = this.#final_move.number; 
      for (let move_step = first_move_number; move_step <= final_move_number; move_step++) {
        // Insert move-number column
        let hotRow = this.#game_notation_tbody.insertRow(-1);
        let newCell = hotRow.insertCell(0);
        newCell.id =  move_step + "number";
        newCell.innerHTML = '<span class="chessmovenumber"> ' 
            + move_step + '. </span>';
        
				console.log(JSON.stringify(this.#move_list));
				
				// Insert white move (if any)
        let white_move_index = move_step + "W";
				
				// alert(white_move_index);
				// alert(this.#MOVE_LIST_DISPLAY_NOTATION);
				// console.log(this.#move_list[white_move_index]);
				
        /* Because of the pre-move bump forward (see above), there
        will always be an *index* for a white move for the first
        move number; what we have to test for here is whether there's
        actually some move notation associated with that index, or whether
        it's the pre-move position, in which case we skip it. 
        */
        if (this.#move_list[white_move_index][this.#MOVE_LIST_DISPLAY_NOTATION]) {
          let white_move_notation = this.#move_list[white_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
          newCell = hotRow.insertCell(1);
          newCell.id = white_move_index;
          if (white_move_notation) {
            let function_name = "game_handler.jump_to_move('" + white_move_index + "')";
            newCell.innerHTML = '<span class="chessmove" onclick="' 
              + function_name + ';">' +  white_move_notation + '</span>';
          }
        }
        // Insert black move (if any)
        let black_move_index = move_step + "B";
        /* Here, on the other hand, we test if there's an *index* 
        for a black move for the current move number.
        */
        if (this.#move_list.hasOwnProperty(black_move_index)) {
          let black_move_notation = this.#move_list[black_move_index][this.#MOVE_LIST_DISPLAY_NOTATION];
          newCell = hotRow.insertCell(2);
          newCell.id = black_move_index;
          if (black_move_notation) {
            let function_name = "game_handler.jump_to_move('" + black_move_index + "')";
            newCell.innerHTML = '<span class="chessmove" onclick="' 
              + function_name + ';">' +  black_move_notation + '</span>';
          }
        }
      }
    }
    catch(error) {
      alert(error);
    }
  }


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
        let game_meta_info = resp["game_meta_info"];
        remote_this.#initial_move.index = game_meta_info["first_move"];
        remote_this.#final_move.index = game_meta_info["last_move"];
        remote_this.#current_move.index = game_meta_info["current_move"]
        remote_this.#movelist_header.innerHTML = game_meta_info["game_header_text"];
        remote_this.#movelist_footer.innerHTML = game_meta_info["game_footer_text"];
        remote_this.#populate_move_display();
        remote_this.jump_to_move(remote_this.#current_move.index); 
      })
      .catch(function(error) {
        alert("Fetch error: " + error);
      });
    }
    catch(error) {
      alert("Regular error:" + error);
    }
  }


}  