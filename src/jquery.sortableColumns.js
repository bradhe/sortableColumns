(function($) {
  var startingIndex = -1;
  var currentlyOver = null;
  var positions = [];
  var table = null;
  var droppedFunction = null;

  function buildPositionIndex(headers) {
    var positions = {};

    for(var i = 0; i < headers.length; i++) {
      var pos = $(headers[i]).position();
      var x = pos.left;
      var y = pos.top;
      
      positions[i] = { 
        'th': headers[i], 
        'position': { top: y, left: x, bottom: y + $(headers[i]).outerHeight(), right: x + $(headers[i]).outerWidth() }
      };
    }
    
    return positions;
  }
  
  var methods = {
    init: function(options) {
      var headers = this.find('th');
      headers.disableSelection();
      table = $(this);

      // We need to build a header position index
      positions = buildPositionIndex(headers);
      
      if(options && options.sorted) {
        droppedFunction = options.sorted;
      }

      headers.bind('mousedown.sortableColumns', function(e) { 
        // Starts at...
        startingIndex = $(this).index();
        
        var th = $(this).clone();
        var span = $('<span/>').append($('<table/>').append($('<tr/>').append(th)));
        span.css('position', 'absolute');
        span.css('left', e.pageX - ($(this).width() / 2));
        span.css('top', e.pageY - ($(this).height() / 2));
        $(span).data('parent', this);
        
        $(this).parents('table').before(span);

        $('body').bind('mousemove.sortableColumns', function(e) {
          span.css('left', e.clientX - (span.width() / 2));
          span.css('top', e.clientY - (span.height() / 2));
          var parent = $(span).data('parent');
          
          for(var i in positions) {
            var pos = positions[i].position;
            var spanPosition = $(span).position();
            var th = $(positions[i].th);
            
            // This is super gross
            if(spanPosition.left >= pos.left && spanPosition.left <= pos.right && $(parent).index() != th.index()) 
            {
              th.addClass('over');
              currentlyOver = th;
            }
            else {
              th.removeClass('over');
            }
          }
        });
        
        $('body').bind('mouseleave.sortableColumns', function() {
          span.remove();
          
          // Also delete 
          $('body').unbind('mousemove.sortableColumns');
          $('body').unbind('mouseup.sortableColumns');
        });
        
        $('body').one('mouseup.sortableColumns', function() {
          if(currentlyOver) {
            var endingIndex = currentlyOver.index();
            
            // Re-arrange all the columns.
            var rows = table.find('tr');

            for(var i = 0; i < rows.length; i++) {
              var row = rows[i];
              var td = row.children[startingIndex];

              if(endingIndex == 0) {
                $(row).prepend(td);
              }
              else if(endingIndex == (row.children.length - 1)) {
                $(row).append(td);
              }
              else {
                $(row.children[endingIndex]).after(td);
              }
            }

            positions = buildPositionIndex(headers);
          }
    
          // Call the callback.
          if(droppedFunction) {
            var row = table.find('thead tr');
            droppedFunction({ 
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
  
          headers.removeClass('over');
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
