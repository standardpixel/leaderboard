var keys           = require(__dirname + '/../keys.json'),
    tracker_module = require(__dirname + '/../server_modules/tracker.js');
    

exports.init = function(response, callback, scope) {
	tracker_module.update(response.request.user.id, callback);
	response.request.res.redirect('/');
}