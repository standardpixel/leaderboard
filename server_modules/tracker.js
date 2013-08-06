var keys       = require(__dirname + '/../keys.json'),
    colors     = require('colors'),
    redis      = require("redis"),
    rclient    = redis.createClient(),
	r_user_key = keys.site.redisKeyPrefix + 'tracker:';
	
	
function get(id, callback) {
	rclient.hgetall(r_user_key + id, function(err, tracker) {
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_user_key + user.id);
			callback('Unable to authenticate. Problem looking up tracker data.', null);
		} else {
			if(tracker) {
				callback(null, tracker);
			} else {
				callback(null, null);
			}
		}
	
	});
}

exports.setupFitbit = function(user_id, auth_token, auth_secret, callback) {
	
	//
	// Look for the tracker
	//
	get(user_id, function(err, tracker) {
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_user_key + user.id);
			callback('Unable to find tracker. Problem looking up tracker data.', null);
			return false;
		}
		
		//
		// If there is no error and no user, proceed to save this user
		// otherwise if there is a user or an error, move on
		//
		if(!tracker) {
			rclient.hmset(r_user_key + user_id, 'type', 'fitbit', 'token', auth_token, 'secret', auth_secret, function(err, replies) {
				
				if(replies === 'OK') {
					callback(null, tracker);
				} else {
					console.error('Error adding tracker'.red, err);
				}
				
			});
		} else {
			callback(null, tracker);
		}
		
	});
}

exports.get = get;