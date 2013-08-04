var config = require(__dirname + '/../keys.json'),
    Flickr = require('flickr.simple.js'),
    flickr = new Flickr(config.flickr.consumerKey, config.flickr.consumerSecret);
	
function filterPhotoObject(photo) {
	
	delete photo['context'];
	delete photo['geo_is_contact'];
	delete photo['geo_is_family'];
	delete photo['geo_is_friend'];
	delete photo['geo_is_public'];
	delete photo['isfamily'];
	delete photo['isfriend'];
	delete photo['ispublic'];
	delete photo['owner'];
	delete photo['place_id'];
	delete photo['title'];
	
	return photo;
}

exports.init = function(response, callback, scope) {
	
	var output = {},
		api_args = response.request.body,
		i;
		
		api_args.sort     = 'interestingness-asc';
		api_args.has_geo  = 1;
		api_args.perpage  = 250; //the flickr max
		api_args.extras   = 'geo';
		api_args.accuracy = api_args.zoom;
		delete api_args.zoom;

	flickr.call_method('flickr.photos.search', api_args, null, function(response) {
		if(response || response.stat === 'ok') {
			
			output['page']    = response.photos['page'];
			output['pages']   = response.photos['pages'];
			output['perpage'] = response.photos['perpage'];
			output['total']   = response.photos['total'];
			output['photos']  = [];
			
			for(i=0; response.photos.photo.length > i; i++) {
				output['photos'].push( filterPhotoObject( response.photos.photo[ i ] ) );
			}
			
			callback.apply(scope || this, [null, output]);
		} else {
			callback.apply(scope || this, [{error:'There was an error getting photos from the flickr search API.'}]);
		}
	});
}