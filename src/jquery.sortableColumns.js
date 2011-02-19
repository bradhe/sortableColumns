(function($) {
  var startingIndex = -1;
  var currentlyOver = null;
  var positions = [];
  var table = null;
  var droppedFunction = null;

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
          top: y, 
          left: x, 
          bottom: y + header.outerHeight(), 
          right: x + header.outerWidth() 
        },
        'center': {
          x: x + (header.outerWidth() / 2),
          y: y + (header.outerHeight() / 2)
        }
      };
    }
    
    return positions;
  }
  
  function distance(p1, p2) {
    var a = Math.abs(p1.x - p2.x);
    var b = Math.abs(p1.y - p2.y);
    return Math.sqrt((a*a) + (b*b));
  }
  
  function highlightRowPosition(cls, oppositeCls, index) {
    var rows = table.find('tr');
    table.find('th.'+oppositeCls).removeClass(oppositeCls);
    table.find('td.'+oppositeCls).removeClass(oppositeCls);
    table.find('th:nth-child('+(index+1)+')').addClass(cls);
    table.find('td:nth-child('+(index+1)+')').addClass(cls);
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
      
      if(options) {
        settings = $.extend(settings, options);
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
          if(settings.showPosition) {
            headers.removeClass(settings.hoverClass);
          }
          
          span[0].style.left = e.clientX - (span.width() / 2);
          span[0].style.top = e.clientY - (span.height() / 2);
          
          var parent = $(span).data('parent');
          var position = $(span).position();
          var center = { x: position.left + (span.width() / 2), y: position.top + (span.height() / 2) };
          
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

          if(th && $(parent).index() != $(th).index()) {
            th = $(th);
            
            if(settings.showPosition && !$(th).hasClass(settings.hoverClass)) {
              th.addClass(settings.hoverClass);
              
              // Show 'left' or 'right' too
              var center = th.position().left + (th.width() / 2);
              
              if(settings.showPositionInRows) {
                var cls = null;
                var oppositeCls = null;
                var index = th.index();
                
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
              else {
                if(center >= e.pageX) {
                  th.addClass(settings.leftClass);
                  th.removeClass(settings.rightClass);
                }
                else {
                  th.addClass(settings.rightClass);
                  th.removeClass(settings.leftClass);
                }              
              }
            }
            
            currentlyOver = $(th);
          }
          else {
            if(settings.showPositionInRows) {
              table.find('th').removeClass(settings.rightClass);
              table.find('td').removeClass(settings.rightClass);
              table.find('th').removeClass(settings.leftClass);
              table.find('td').removeClass(settings.leftClass);
              /*table.find('th, td').removeClass(settings.leftClass);*/
            }
            else {
              headers.removeClass(settings.rightClass);
              headers.removeClass(settings.leftClass);
            }
            
            headers.removeClass(settings.hoverClass);
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
  
          if(settings.showPositionInRows) {
            table.find('th.'+settings.rightClass).removeClass(settings.rightClass);
            table.find('td.'+settings.rightClass).removeClass(settings.rightClass);
            
            table.find('th.'+settings.leftClass).removeClass(settings.leftClass);
            table.find('td.'+settings.leftClass).removeClass(settings.leftClass);
          }
          else {
            headers.removeClass(settings.rightClass);
            headers.removeClass(settings.leftClass);
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