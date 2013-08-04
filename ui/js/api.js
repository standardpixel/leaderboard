YUI().add('imMapApi', function(Y) {
	
	Y.imMapApi = {
		flickrToHeat : function(flickr_output) {
		
			var heatmap_input = [], i;
		
			for(i=0; flickr_output.photos.length > i; i++) {
				heatmap_input.push({
					lat   : flickr_output.photos[i].latitude,
					lon   : flickr_output.photos[i].longitude,
					value : 1
				});
			}
		
			return heatmap_input;
		
		},

		flickr_api_search_cached : function(zoom, options, callback, scope) {
			Y.use('io', function(Y) {
				options = options || {};
				var data = {};
			
				//if(localStorage['imMapSearchCache:' + zoom]) {
				//	callback.apply(scope || this, [localStorage['imMapSearchCache:' + zoom]]);
				//
				//} else {
					
					options.zoom = zoom || options.zoom || 2;
					
					if(!options.bbox) {
						delete options.bbox;
					}
					
					data = options;
					
					//
					// Get some flickr photos
					//
					Y.one('#spinner').setStyle('opacity', 1);
					Y.io('/api/flickr', {
						method : 'post',
						data   : data,
						on : {
							complete : function(id, response) {
								if(response && response.statusText==='OK') {
							
									//if(zoom <= 3) {
									//	localStorage['imMapSearchCache:' + zoom] = response.responseText;
									//}
							
									callback.apply(scope || this, [response.responseText]);
							
								} else {
									Y.fire('immersiveMap:error', {message:'Error getting photos from Flickr'});
								}
								
								Y.one('#spinner').setStyle('opacity', 0);
							}
						}
					});
					//}

			});
		}
	}
	
});