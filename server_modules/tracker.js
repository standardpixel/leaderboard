var keys          = require(__dirname + '/../keys.json'),
    colors        = require('colors'),
    redis         = require("redis"),
    rclient       = redis.createClient(),
	r_tracker_key = keys.site.redisKeyPrefix + 'tracker:',
	r_day_key     = keys.site.redisKeyPrefix + 'day:',
	fitbit        = require('fitbit-js')(keys.fitbit.key, keys.fitbit.secret),
	OAuth         = require('oauth').OAuth,
	oa_clients    = {};
	
function getClient(partner) {
	var config = keys.fitbit;
	
	if(!oa_clients[partner]) {
		oa_clients[partner] = new OAuth(config.oauth[0],config.oauth[1], config.oauth[2], config.oauth[3], config.oauth[4], config.oauth[5], config.oauth[6], config.oauth[7]);
	}
	
	return oa_clients[partner];
}
exports.getClient = getClient;
	
function get(id, callback) {
	rclient.hgetall(r_tracker_key + id, function(err, tracker) {
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_tracker_key + user.id);
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
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_tracker_key + user.id);
			callback('Unable to find tracker. Problem looking up tracker data.', null);
			return false;
		}
		
		//
		// If there is no error and no user, proceed to save this user
		// otherwise if there is a user or an error, move on
		//
		if(!tracker) {
			
			rclient.hmset(r_tracker_key + user_id, 'type', 'fitbit', 'token', o.oauth_token, 'secret', o.oauth_secret, 'partner_id', o.fitbit_id,  function(err, replies) {
				
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
	
		if(tracker.type === 'fitbit') {
			getClient(tracker.type).get(
				'http://api.fitbit.com/1/user/' + tracker.partner_id + '/activities/date/' + yesterday_string + '.json',
				tracker.token,
				tracker.secret,
				function(err, response) {
					if(err) {
						callback(err, null);
						return false;
					}
					
					day_data = JSON.parse(response);
					
					rclient.hmset(r_day_key + user_id + ':' + yesterday_string, 'type', 'fitbit', 'steps', day_data.summary.steps, function(err, replies) {
				
						callback(err, {
							tracker : tracker,
							data    : response
						});
						return false;
				
					});
					
				}
			);
		} else {
			console.error('Unknown tracker type');
			return false;
		}
		
	});

}

exports.update = function(user_id, callback) {
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