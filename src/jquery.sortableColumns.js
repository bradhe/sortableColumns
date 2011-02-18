(function($) {
  var startingIndex = -1;
  var currentlyOver = null;
  var positions = [];
  
  var methods = {
    init: function(options) {
      var headers = this.find('th');
      headers.disableSelection();
      
      // We need to build a header position index
      positions = {};
      for(var i = 0; i < headers.length; i++) {
        var pos = $(headers[i]).position();
        var x = pos.left;
        var y = pos.top;
        
        positions[i] = { 'th': headers[i], 'position': { top: y, left: x, bottom: y + $(headers[i]).outerHeight(), right: x + $(headers[i]).outerWidth() }};
      }

      headers.bind('mousedown.sortableColumns', function(e) { 
        // Starts at...
        startingIndex = $(this).index();
        
        var th = $(this).clone();
        var span = $('<span/>').append($('<table/>').append($('<tr/>').append(th)));
        span.css('position', 'absolute');
        span.css('left', e.pageX - ($(this).width() / 2));
        span.css('top', e.pageY - ($(this).height() / 2));
        
        $(this).parents('table').before(span);

        $('body').bind('mousemove.sortableColumns', function(e) {
          span.css('left', e.clientX - (span.width() / 2));
          span.css('top', e.clientY - (span.height() / 2));
          
          for(var i in positions) {
            var pos = positions[i].position;
            var spanPosition = $(span).position();
            
            if(spanPosition.left > pos.left 
              && spanPosition.left < pos.right 
              && spanPosition.top > pos.top 
              && spanPosition.top < pos.bottom) {
              $(positions[i].th).addClass('over');
            }
            else {
              $(positions[i].th).removeClass('over');
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
          span.remove();
          $('body').unbind('mousemove.sortableColumns');
        });
      });
      
      headers.bind('mouseover', function() { console.log('over'); });
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