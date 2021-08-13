class BreadcrumbsHandler {
    // Data objects
    #openings_breadcrumb_list;
    // Text const for breadcrumbs
    #BREADCRUMB_SPACER = '<img src="../static/breadcrumb_spacer.png"  alt="opening breadcrumb spacer" >';
    // DOM object to populate
    #breadcrumb_space;

    constructor() {
        this.#openings_breadcrumb_list = [];
        this.#BREADCRUMB_SPACER = '<img src="../static/breadcrumb_spacer.png"  alt="opening breadcrumb spacer" >'
        this.#breadcrumb_space = document.getElementById("breadcrumb_space");
    }

    
  update_breadcrumbs(opening_key, opening_name_text) {
    let new_breadcrumb_text = '';
    /* Loop through the openings_breadcrumb_list. If we find the key,
     truncate it. In either case, add the new pair to the end of the
     list and the new text (as plain text, not a link) to the end of
     the breadcrumbs.
    */
    for (let step = 0; step < this.#openings_breadcrumb_list.length; step++) {
      if (this.#openings_breadcrumb_list[step][0] == opening_key) {
        // Stop the loop and truncate the list of breadcrumbs.
        this.#openings_breadcrumb_list = this.#openings_breadcrumb_list.slice(0, step);
        break;
      }
      new_breadcrumb_text = this.#add_breadcrumb(this.#openings_breadcrumb_list[step][1], 
        new_breadcrumb_text, this.#openings_breadcrumb_list[step][0]);
    }
    // Add the final breadcrumb as plain text (no link).
    new_breadcrumb_text = this.#add_breadcrumb(opening_name_text, new_breadcrumb_text);
    // and add it to the global breadcrumb list
    this.#openings_breadcrumb_list.push([opening_key, opening_name_text]);
    // Update the visible document.
    this.#breadcrumb_space.innerHTML = new_breadcrumb_text;
  }
  
  #add_breadcrumb(crumb_text, crumb_trail = '', crumb_key = 0) {
    let new_crumb = '';
    if (crumb_key) {
      new_crumb= '<span id="opening_' + crumb_key + '" class="breadcrumbs"' +
      '" onclick="openings_handler.load_openings(' + crumb_key + ');">' +
        crumb_text + ' </span>'
    } else {
      new_crumb = "&nbsp; " + crumb_text; 
    }
    if (crumb_trail) {
      crumb_trail = crumb_trail + this.#BREADCRUMB_SPACER + new_crumb;
    } else {
      crumb_trail = new_crumb;
    }
    return crumb_trail;
  }
}



class OpeningsHandler {
    // set of board icons for opening data 
    #board_list;// DOM objects for population
    #related_game_display_space;
    #related_game_list_caption;
    #opening_header_space;
    #opening_display_space;

    constructor() {
        try{
            this.#board_list = [];
            this.#related_game_display_space = document.getElementById("related_game_display_space");
            this.#related_game_list_caption = document.getElementById("related_game_list_caption");
            this.#opening_header_space = document.getElementById("opening_display_caption");
            this.#opening_display_space = document.getElementById("opening_display_space");
        }
        catch (error) {
            alert(error);
        }
    }



  // Display little chessboard icons for opening exploration
  #display_opening_board_icons(opening_header, opening_array) {
    try{
      this.#opening_header_space.innerHTML = opening_header;
      // First, remove existing thumbnails
      while (this.#opening_display_space.firstChild) {
        this.#opening_display_space.removeChild(this.#opening_display_space.firstChild);
      }
      // Now let's repopulate the thumbnail display space
      for (let step = 0; step < opening_array.length; step++) {
        let opening_config = {
          showNotation: false,
          draggable: false
        };
        opening_config['position'] = opening_array[step].position;
        let board_icon_name = opening_array[step].abbrev + "_board";
        let board_label_name = opening_array[step].abbrev + "_header";
        /* Make a new div, with a span giving the opening's name
        (header) and a div holding the board icon.*/
        let hot_thumbnail = document.createElement("div");
        
        let hot_thumbnail_contents = '<span id="' + board_label_name + 
        '">' + opening_array[step].name + 
        '</span><div id="' + board_icon_name + 
        '" style="width: 180px"  onclick="openings_handler.load_openings(' + 
        opening_array[step].node_key + ');"></div>';
        hot_thumbnail.innerHTML = hot_thumbnail_contents;
        this.#opening_display_space.appendChild(hot_thumbnail);
        var New_Board = Chessboard(board_icon_name, opening_config);
        Board_List[step] = New_Board;
      }
    }  catch(error) {
      alert("display error:" + error);
    }
  }


  // Display list of games for matching opening 
  
  #display_games_matching_opening_position(opening_node_key) {
    try {    
    let base_URL = '/retrieve_opening_game_info/___dummy___';
    let hot_URL = base_URL.replace('___dummy___', opening_node_key)
    let remote_this = this;
    fetch(hot_URL)
      .then((resp) => resp.json())
      .then(function (resp) {
        let hot_game = resp["hot_game"];
        let stem_position_key = resp["stem_position_key"];
        let game_list = resp["game_list"];
  
        /* -- Display the opening thumbnail icons -- */
  
        // First, some DOM housekeeping
        remote_this.#related_game_list_caption.innerHTML = 'Games';
        // Remove existing game listings
        while (remote_this.#related_game_display_space.firstChild) {
            remote_this.#related_game_display_space.removeChild(remote_this.#related_game_display_space.firstChild);
        }
        // Now let's populate the space for the game listings;
        if (game_list) {  
          for (let game_index in game_list) {
            let hot_row = remote_this.#related_game_display_space.insertRow();
            let hot_cell = hot_row.insertCell();
            let hot_cell_contents = '<span id="game_' + game_index + 
            '" onclick="game_handler.load_game(' + game_index + ', ' + stem_position_key + ');">' + 
            game_list[game_index] + '</span>'
            hot_cell.innerHTML = hot_cell_contents;
          }
        }
        // and the move list

        /* This condition means that the game doesn't reset (to the
            default, presumably) when we return to Root Openings.
            This may change. 
        */
        if (hot_game > 0) 
          {
            game_handler.load_game(hot_game, stem_position_key);
          }
      })
      .catch(function(error) {
        alert("Fetch error: " + error);
      });
    }
    catch(error) {
      alert("Regular error:" + error);
    }
  } 
  
    
  #wipe_matching_games() {
    this.#related_game_display_space.innerHTML = '';
    this.#related_game_list_caption.innerHTML = '';
  }
  

  load_openings(opening_root) {
    try {    
    let base_URL = '/get_openings/___dummy___';
    let hot_URL = base_URL.replace('___dummy___', opening_root)
    let move_index = '';
    let remote_this = this;
    fetch(hot_URL)
      .then((resp) => resp.json())
      .then(function (resp) {
        let opening_header = resp["opening_header_text"];     
        let opening_dict = resp["opening_dicts"]
        if (opening_dict) {
            remote_this.#display_opening_board_icons(opening_header, opening_dict);
        }
        else {
          // alert("That opening node has no children");
        }
        if (opening_root > 0) {
            remote_this.#display_games_matching_opening_position(opening_root);
        } else {
            remote_this.#wipe_matching_games();
        }
        breadcrumbs_handler.update_breadcrumbs(opening_root, opening_header);
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