var keys         = require(__dirname + '/../keys.json'),
    colors       = require('colors'),
    redis        = require("redis"),
    rclient      = redis.createClient(),
	r_user_key   = keys.site.redisKeyPrefix + 'tracker:',
	fitbit       = require('fitbit-js')(keys.fitbit.key, keys.fitbit.secret);
	
	
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
exports.get = get;

exports.setupFitbit = function(user_id, oauth_credentials, callback) {
	
	var o = oauth_credentials;
	
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
			
			rclient.hmset(r_user_key + user_id, 'type', 'fitbit', 'token', o.oauth_token, 'secret', o.oauth_secret, 'partner_id', o.fitbit_id,  function(err, replies) {
				
				if(replies === 'OK') {
					oauth_credentials.type = 'fitbit';
					callback(null, oauth_credentials);
				} else {
					console.error('Error adding tracker'.red, err);
				}
				
			});
		} else {
			callback(null, tracker);
		}
		
	});
}

function actuallyUpdate(user_id, tracker, callback) {
	var today     = new Date(),
	    yesterday = today.setDate(today.getDate() - 1),
		yesterday_string = new Date(yesterday).getFullYear() + '-' + (new Date(yesterday).getMonth() + 1) + '-' + new Date(yesterday).getDate();
		
	get(user_id, function(err, tracker) {
		
		console.log('tracker', tracker);
	
		if(tracker.type === 'fitbit') {
			fitbit.apiCall('GET', '/user/' + tracker.partner_id + '/profile.json',
			{token: {oauth_token_secret: tracker.secret, oauth_access_token: tracker.token}},
			function(err, resp, json) {
				if(err) {
					console.error('Error', err);
				}
				console.log('Update done', arguments);
			});
		} else {
			console.error('Unknown tracker type');
			return false;
		}
		
	});

}

exports.update = function(user_id) {
	var callback = arguments[arguments.length-1],
	    options = arguments.length > 2 ? arguments[1] : {};
		
	if(!options.type) {
		get(user_id, function(err, tracker) {
			actuallyUpdate(user_id, tracker, callback);
		})
	} else {
		actuallyUpdate(user_id, options, callback);
	}
}