(function($) {
  var startingIndex = -1;
  var columnIndex = null;
  var currentlyOver = null;
  var positions = [];
  var table = null;
  var droppedFunction = null;
  var currentlyHighlighted = null;
  var lastMovement = null;
  var span = null;
  var headers = null;
  
  // TODO: Finish this implementation. $.addClass and $.removeClass are both
  // very very slow.
  function fastPushClass(cls, element) {
    $(element).addClass(cls);
//    element.className = element.className + ' ' + cls;
    return element;
  }
  
  function fastPopClass(cls, element) {
    $(element).removeClass(cls);
//    element.className = element.className.substring(0, element.className.length - cls.length);
    return element; 
  }

  function mouseMoved(e) {
    span.css('left', e.pageX - (span.width() / 2));
    span.css('top', e.pageY - (span.height() / 2));

    // Don't do anything unless it's moved so far.
    if(lastMovement && distance({ x: e.clientX, y: e.clientY }, lastMovement) < 20) {
      return false;
    }
    else {
      lastMovement = { x: e.clientX, y: e.clientY };
    }
    
    var center = { x: e.pageX, y: e.pageY };
    var th = null;

    for(var i in positions) {
      var pos = positions[i];
      var p = pos.position;
      var c = positions[i].center;
     
      if((e.pageX - p.left) > 0 && (p.right - e.pageX) > 0) {
        // Make sure we're within 50px of the center.
        if(Math.abs(e.pageY - c.y)) {
          th = pos.th;
          break;
        }
      }
    }

    var parent = span.data('parent');

    if(th && currentlyOver != th && th != parent) {
      th = $(th);

      if(currentlyOver) {
        currentlyOver.removeClass(settings.leftClass);
        currentlyOver.removeClass(settings.rightClass);
        currentlyOver.removeClass(settings.hoverClass);
      }
      
      if(settings.showPosition) {
        fastPushClass(settings.hoverClass, th[0]);
        // Show 'left' or 'right' too
        var center = th.position().left + (th.width() / 2);
      
        var cls = null;
        var oppositeCls = null;
        var index = th.data('columnIndex');
        
        if(center >= e.pageX) {
          cls = settings.leftClass;
          oppositeCls = settings.rightClass;
        }
        else {
          cls = settings.rightClass;
          oppositeCls = settings.leftClass;
        }

        if(settings.showPositionInRows) {                
          highlightRowPosition(cls, oppositeCls, index);
        }
        else {
          // remove previous class on previous element.
          if(currentlyOver) {
            currentlyOver.removeClass(oppositeCls).removeClass(cls);
          }
          
          th.addClass(cls);
        }
      }
      
      currentlyOver = th;
    }
    else if(!th || th == parent) {
      if(currentlyOver) {
        fastPopClass(settings.hoverClass, currentlyOver[0]);
        fastPopClass(settings.leftClass, currentlyOver[0]);
        fastPopClass(settings.rightClass, currentlyOver[0]);
      }

      currentlyOver = null;
    }

    // Calculate the positioning outside of this thing.
    if(currentlyOver) {
      var center = currentlyOver.position().left + (currentlyOver.width() / 2);

      if(center >= e.pageX) {
        currentlyOver.addClass(settings.leftClass);
      }
      else {
        currentlyOver.addClass(settings.rightClass);
      }
    }
    
    // Prevent default behavior?
    return false;
  }

  function mouseDown(e) {
    // Starts at...
    startingIndex = $(this).index();

    var th = $(this).clone();
    if(th.isEmpty()) {
      th.html('&nbsp;');
    } 

    var parentTable = $('<table/>').append();
    parentTable[0].className = table[0].className;
    parentTable.append($('<tr/>').append(th));
    
    span = $('<span/>').append(parentTable);
    span.addClass('sortable-handle');
    span.data('parent', this);
    span[0].style.position = 'absolute';
    span.css('width', $(this).width() + 'px');
    span.css('left', e.pageX - ($(this).width() / 2));
    span.css('top', e.pageY - ($(this).height() / 2));

    var parent = this;

    var centerOffset = { x: $(span).width() / 2, y: $(span).height() / 2 };
    
    $(this).parents('table').before(span);

    $('body').bind('mousemove.sortableColumns', mouseMoved);
    
    $('body').bind('mouseleave.sortableColumns', function() {
      span.remove();
      headers.removeClass(settings.hoverClass);
      
      // Also delete 
      $('body').unbind('mousemove.sortableColumns');
      $('body').unbind('mouseup.sortableColumns');
    });
    
    $('body').one('mouseup.sortableColumns', mouseUp);
  }

  function mouseUp(e) {
    // Only do this work if we are over an element.
    if(currentlyOver) {
      currentlyOver.removeClass(settings.leftClass);
      currentlyOver.removeClass(settings.rightClass);
      currentlyOver.removeClass(settings.hoverClass);

      var endingIndex = currentlyOver.index();
      
      // Re-arrange all the columns.
      var rows = table.find('tr');
      
      // We need to figure out if we're going before or after the
      // current element.
      var insertAfter = true;
      
      if(rows.length > 0 && endingIndex < rows[0].children.length && e) {
        var element = $(rows[0].children[endingIndex]);
        var position = $(element).position();
        var center = position.left + ($(element).width() / 2);

        if(center <= e.pageX) {
          insertAfter = true;
        }
        else {
          insertAfter = false;
        }
      }
      
      var finalIndex = null;

      for(var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var td = row.children[startingIndex];

        var element = $(row.children[endingIndex]);
        
        if(insertAfter) {
          $(element).after(td);
        } 
        else {
          $(element).before(td);
        }
        
        // Set this so that we can report where it eventually ended up
        // later.
        if(finalIndex == null) {
          finalIndex = $(element).index();
        }
      }
      
      endingIndex = finalIndex;
      positions = buildPositionIndex(headers);
    }

    // Call the callback if one is specified.
    if(currentlyOver && settings.sorted) {
      var row = table.find('thead tr');
      settings.sorted({ 
        startedAt: startingIndex, 
        endedAt: endingIndex, 
        elements: { 
          starting: row.children[startingIndex], 
          ending: row.children[endingIndex]
        }
      });
    }

    if(settings.showPositionInRows && currentlyHighlighted) {
      $(currentlyHighlighted).removeClass(settings.rightClass);
      $(currentlyHighlighted).removeClass(settings.leftClass);
    }

    currentlyOver = null;
    span.remove();
        
    $('body').unbind('mousemove.sortableColumns');

    // NOTE: Do not return false here. We need to allow this event to
    // continue bubbling and we don't want to interfecre with any default
    // behavior.
  }

  // Creates an index of all of the positions of the TH elements passed in.
  // This is because $.index is really slow.
  function buildPositionIndex(headers) {
    var positions = {};

    for(var i = 0; i < headers.length; i++) {
      var header = $(headers[i])
      var pos = header.position();
      var x = pos.left;
      var y = pos.top;
      
      positions[i] = { 
        'th': headers[i], 
        'position': { 
          left: x, 
          right: x + header.outerWidth(), 
          top: y, bottom: y + header.outerHeight() 
        },
        'center': {
          x: x + (header.outerWidth() / 2),
          y: y + (header.outerHeight() / 2)
        }
      };
    }
    
    return positions;
  }
  
  // This indexes the columns for easy lookup later. Not sure if it's actually
  // used for anything yet.
  function buildColumnsIndex(headers, grid) {
    var rows = grid.find('tr');
    var index = {};
    
    for(var i = 0; i < headers.length; i++) {
      $(headers[i]).data('columnIndex', i);
    }
    
    // Now fille the index
    for(var i = 0; i < rows.length; i++) {
      var row = rows[i];
      
      for(var j = 0; j < row.children.length; j++) {
        if(!index[j]) {
          index[j] = [];
        }
      
        var child = row.children[j];
        index[j].push(child);
      }
    }
    
    return index;
  }
  
  // This function calculates the distance between two cartesian coords
  // on the screen. It is used to determine the closest two poitns.
  function distance(p1, p2) {
    var a = Math.abs(p1.x - p2.x);
    var b = Math.abs(p1.y - p2.y);
    return Math.sqrt((a*a) + (b*b));
  }
  
  // TODO: Determine if this is actually nescessary.
  function highlightRowPosition(cls, oppositeCls, index) {
    if(currentlyHighlighted) {
      for(var i = 0; i < currentlyHighlighted.length; i++) {
        fastPopClass(oppositeCls, currentlyHighlighted[i]);
      }
    }
    
    currentlyHighlighted = columnIndex[index];
    for(var i = 0; i < currentlyHighlighted.length; i++) {
      fastPopClass(cls, currentlyHighlighted[i]);
    }
  } 

  // Some helpers
  function internalInit(ths, table) {
    // We need to build a header position index
    positions = buildPositionIndex(headers);
    columnIndex = buildColumnsIndex(headers, table);
  }

  function reinit(ths, table) {
    internalInit(ths, table);
  }
  // end some helpers
  
  // These are the default settings. They will be merged
  // with the customizable settings later.
  var settings = {
    sorted: null,
    showPosition: true,
    hoverClass: 'sortable-over',
    leftClass: 'sortable-left',
    rightClass: 'sortable-right',
    showPositionInRows: false
  };
  
  var methods = {
    init: function(options) {
      headers = this.find('th:not(.unsortable)');
      headers.disableSelection();
      table = $(this);

      if(options) {
        settings = $.extend(settings, options);
      }

      internalInit(headers, table); 
      headers.bind('mousedown.sortableColumns', mouseDown);

      return table;
    },
    addColumn: function(th) {
      headers.push(th);
      $(th).bind('mousedown.sortableColumns', mouseDown);
      $(th).disableSelection();

      reinit(headers, table);
    },
    removeColumn: function(th) {
      var newHeaders = [];
      
      for(var i = 0; i < headers.length; i++) {
        if(headers[i] == th) {
          $(headers[i]).unbind('mousedown.sortableColumns');
          continue;
        } 
      
        newHeaders.push(headers[i]);
      }

      headers = $(newHeaders);
      reinit(headers, table);
    }
  };
  
  $.fn.sortableColumns = function(method) {
    if ( methods[method] ) {
      return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.sortableColumns' );
    }
  };
}(jQuery));
