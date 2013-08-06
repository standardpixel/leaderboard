var keys    = require(__dirname + '/../keys.json'),
    tracker = require(__dirname + '/../server_modules/tracker.js');
    

exports.init = function(response, callback, scope) {
	if(response.request.user) {
		tracker.get(response.request.user.id, function(err, tracker) {
			callback({tracker:tracker});
		});
	} else {
		callback();
	}
}