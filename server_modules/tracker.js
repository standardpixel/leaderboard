var keys          = require(__dirname + '/../keys.json'),
    colors        = require('colors'),
    redis         = require("redis"),
    rclient       = redis.createClient(),
	r_tracker_key = keys.site.redisKeyPrefix + 'tracker:',
	r_day_key     = keys.site.redisKeyPrefix + 'day:',
	fitbit        = require('fitbit-js')(keys.fitbit.key, keys.fitbit.secret),
	OAuth         = require('oauth').OAuth,
	OAuth2        = require('oauth').OAuth2,
	oa_clients    = {};
	
function getClient(partner, oauth_version) {
	var config = keys[partner];
	
	if(partner === 'moves') {
		var Moves = require('moves'), 
		    moves = new Moves({
				client_id: config.key, 
				client_secret: config.secret, 
				redirect_uri: 'http://127.0.0.1:3000/bind/moves/callback'
			});
			
		oa_clients[partner] = moves;
	} else {
		oauth_version = oauth_version || 1;
	
		if(!oa_clients[partner]) {
			if(oauth_version === 1) {
				oa_clients[partner] = new OAuth(config.oauth[0],config.oauth[1], config.oauth[2], config.oauth[3], config.oauth[4], config.oauth[5], config.oauth[6], config.oauth[7]);
			} else if(oauth_version === 2){
				oa_clients[partner] = new OAuth2(config.oauth2[0],config.oauth2[1], config.oauth2[2], config.oauth2[3], config.oauth2[4], config.oauth2[5], config.oauth2[6], config.oauth2[7]);
			}
		}
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

function getDay(id, date, callback) {
	rclient.hgetall(r_day_key + id + ':' + date, function(err, day) {
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_day_key + id);
			callback('Unable to authenticate. Problem looking up tracker data.', null);
		} else {
			if(day) {
				day.user_id = id;
				callback(null, day);
			} else {
				callback(null, null);
			}
		}
	
	});
}
exports.getDay = getDay;

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

exports.setupMoves = function(user_id, config, callback) {
	
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
			
			rclient.hmset(r_tracker_key + user_id, 'type', 'moves', 'access_token', config.access_token, 'refresh_token', config.refresh_token, 'expires_in', config.expires_in,  function(err, replies) {
				
				if(replies === 'OK') {
					config.type = 'moves';
					callback(null, config);
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
		} else if(tracker.type === 'moves') {
			getClient(tracker.type).get('/user/summary/daily?pastDays=1', tracker.access_token, function(error, response, body) {
				
				var wlk, cyc, run, i, item;
				
				day_data = JSON.parse(body)[0];
				
				for(i=0; day_data.summary.length > i; i++) {
					item = day_data.summary[i];
					if(item['activity'] === 'wlk') {
						wlk = item.steps || 0;
					} else if(item['activity'] === 'run') {
						run = item.steps || 0;
					} else if(item['activity'] === 'cyc') {
						cyc = item.distance || 0;
					}
				}
				
				rclient.hmset(r_day_key + user_id + ':' + yesterday_string, 'type', 'moves', 'wlk', wlk, 'cyc', cyc, 'run', run, function(err, replies) {
			
					callback(err, {
						tracker : tracker,
						data    : day_data
					});
					return false;
			
				});
			})
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