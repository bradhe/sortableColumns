(function($) {
  var startingIndex = -1;
  var columnIndex = null;
  var currentlyOver = null;
  var positions = [];
  var table = null;
  var droppedFunction = null;
  var currentlyHighlighted = null;
  var lastMovement = null;
  
  function fastPushClass(cls, element) {
    element.className = element.className + ' ' + cls;
    return element;
  }
  
  function fastPopClass(cls, element) {
    element.className = element.className.substring(0, element.className.length - cls.length);
    return element; 
  }

  function buildPositionIndex(headers) {
    var positions = {};

    for(var i = 0; i < headers.length; i++) {
      var header = $(headers[i])
      var pos = header.position();
      var x = pos.left;
      var y = pos.top;
      
      positions[i] = { 
        'th': headers[i], 
        'center': {
          x: x + (header.outerWidth() / 2),
          y: y + (header.outerHeight() / 2)
        }
      };
    }
    
    return positions;
  }
  
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
  
  function distance(p1, p2) {
    var a = Math.abs(p1.x - p2.x);
    var b = Math.abs(p1.y - p2.y);
    return Math.sqrt((a*a) + (b*b));
  }
  
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
  
  var settings = {
    sorted: null,
    showPosition: true,
    hoverClass: 'over',
    leftClass: 'left',
    rightClass: 'right',
    showPositionInRows: true
  };
  
  var methods = {
    init: function(options) {
      var headers = this.find('th');
      headers.disableSelection();
      table = $(this);

      // We need to build a header position index
      positions = buildPositionIndex(headers);
      columnIndex = buildColumnsIndex(headers, table);
     
      if(options) {
        settings = $.extend(settings, options);
      }

      headers.bind('mousedown.sortableColumns', function(e) { 
        // Starts at...
        startingIndex = $(this).index();
        
        //var th = $('<th/>').text($(this).text()).addClass(this.className);
        var th = $(this).clone();
        var span = $('<span/>').append($('<table/>').append($('<tr/>').append(th)));
        span[0].style.position = 'absolute';
        span[0].style.left = e.pageX - ($(this).width() / 2);
        span[0].style.top = e.pageY - ($(this).height() / 2);
        var parent = this;
        
        var centerOffset = { x: $(span).width() / 2, y: $(span).height() / 2 };
        
        $(this).parents('table').before(span);

        $('body').bind('mousemove.sortableColumns', function(e) {
          span[0].style.left = e.clientX - (span.width() / 2);
          span[0].style.top = e.clientY - (span.height() / 2);
          
          // Don't do anything unless it's moved so far.
          if(lastMovement && distance({ x: e.clientX, y: e.clientY }, lastMovement) < 30) {
            return false;
          }
          else {
            lastMovement = { x: e.clientX, y: e.clientY };
          }
          
          var center = { x: e.pageX, y: e.pageY };
          var minDistance = null;
          var th = null;

          for(var i in positions) {
            var pos = positions[i];
            var d = distance(center, pos.center);
            
            if((minDistance == null || d < minDistance) && d < 75) {
              minDistance = d;
              th = pos.th;
            }
          }

          if(th && currentlyOver != th) {
            th = $(th);
            
            if(currentlyOver) {
              fastPopClass(settings.hoverClass, currentlyOver[0]);
            }
            
            if(settings.showPosition && !th.hasClass(settings.hoverClass)) {
              fastPushClass(settings.hoverClass, th[0]);
              
              if(settings.showPositionInRows) {
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
                
                highlightRowPosition(cls, oppositeCls, index);
              }
            }
            
            currentlyOver = th;
          }
          else {
            currentlyOver = null;
          }
     
          
          // Prevent default behavior?
          return false;
        });
        
        $('body').bind('mouseleave.sortableColumns', function() {
          span.remove();
          headers.removeClass(settings.hoverClass);
          
          // Also delete 
          $('body').unbind('mousemove.sortableColumns');
          $('body').unbind('mouseup.sortableColumns');
        });
        
        $('body').one('mouseup.sortableColumns', function(e) {
          if(currentlyOver) {
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

              if(endingIndex == 0) {
                $(row).prepend(td);
              }
              else {
                var element = $(row.children[endingIndex]);
                
                if(insertAfter) {
                  $(element).after(td);
                } 
                else {
                  $(element).before(td);
                }
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

          currentlyOver = null;
          span.remove();
  
          if(settings.showPositionInRows && currentlyHighlighted) {
            $(currentlyHighlighted).removeClass(settings.rightClass);
            $(currentlyHighlighted).removeClass(settings.leftClass);
          }
          
          headers.removeClass(settings.hoverClass);
          
          $('body').unbind('mousemove.sortableColumns');
        });
      });
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