var keys            = require(__dirname + '/../keys.json'),
    colors          = require('colors'),
    redis           = require("redis"),
    rclient         = redis.createClient(),
	r_user_key      = keys.site.redisKeyPrefix + 'user:',
	OAuth           = require('oauth').OAuth,
	user_id         = null,
	twitter_friends = null,
	twitter_creds   = null,
	require_session = {};

exports.sessionSet = function(key, value) {
	require_session[key] = value;
	return require_session;
}

exports.sessionGet = function(key) {
	return require_session[key];
}

function findById(id, callback) {
	rclient.hgetall(r_user_key + id, function(err, reply) {
		
		var user_decorated;
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_user_key + user.id);
			callback('Unable to authenticate. Problem looking up user data.', null);
		} else {
			if(reply) {
				user_id = id;
				user_decorated = reply;
				user_decorated.id = id;
				user_decorated.twitter_cred = twitter_creds;
				callback(null, user_decorated);
			} else {
				callback(null, null, {message:'none found', original_query:id});
			}
		}
	
	});
}
exports.findById = findById;

exports.findOrCreate = function(user, callback, twitter_cred) {
	
	twitter_creds = twitter_cred;
	
	var user_decorated;
	
	//
	// Look for the user
	//
	findById(user.id, function(err, user_decorated) {
		
		if(err) {
			console.error('Error while looking up user'.red, err, 'Key used: ' + r_user_key + user.id);
			callback('Unable to authenticate. Problem looking up user data.', null);
			return false;
		}
		
		//
		// If there is no error and no user, proceed to save this user
		// otherwise if there is a user or an error, move on
		//
		if(!user_decorated) {
			rclient.hmset(r_user_key + user.id, 'fullName', user._json.name, 'displayName', user._json.screen_name, function(err, replies) {
				
				if(replies === 'OK') {
					user_id = user.id;
					user_decorated = user;
					user_decorated.twitter_cred = twitter_creds;
					callback(null, user_decorated);
				} else {
					console.error('Error adding user'.red, err);
				}
				
			});
		} else {
			user_decorated.twitter_cred = twitter_cred;
			callback(null, user_decorated);
		}
		
	});
}

function updateTwitterUsers(ids, keys_array, callback) {

	var output       = {},
	    redis_output = null,
		start_count  = 0,
		end_count    = 0,
		finished     = null,
	    oauth = new OAuth(
		'https://api.twitter.com/oauth/request_token',
		'https://api.twitter.com/oauth/access_token',
		keys.twitter.key,
		keys.twitter.secret,
		'1.0A',
		null,
		'HMAC-SHA1'
	);
	oauth.get(
		'https://api.twitter.com/1.1/users/lookup.json?user_id='+ids.join(','),
		require_session['twitter_cred'][0],
		require_session['twitter_cred'][1],            
		function (e, data, res){
			if (e) console.error(e);
			details = JSON.parse(data);
			
			for(var i in details) {
				redis_output = [r_user_key + details[i].id],
				start_count++;
				output[details[i].id] = {};
				for(var ii=0; keys_array.length > ii; ii++) {
					output[details[i].id][keys_array[ii]] = details[i][keys_array[ii]];
					redis_output.push(keys_array[ii]);
					redis_output.push(details[i][keys_array[ii]]);
				}

				rclient.hmset(redis_output, function(err, replies) {
				
					if(start_count === end_count) {
						end_count++;
					} else {
						finished = true;
					}

					if(finished) {
						if(replies === 'OK') {
							callback(null, output);
						} else {
							console.error('Error updating user'.red, err);
						}
					}
				
				});
			}
		}
	);
}

exports.getUserDetails = function(ids, options, callback) {
	
	var output         = {},
	    needs_fetching = {ids:[]},
		count          = 0;
	
	options = options || {};
	
	if(!ids) {
		callback('No user ID', null);
		return false;
	}
	
	if(!options.required && (typeof ids) === "number") {
		findById(ids, callback);
		return true;
	} else {
		
		options.required = options.required || [];
		
		if((typeof ids) === "number") {
			ids = [ids];
		}
		
		for(var i=0; ids.length > i; i++) {
			findById(ids[i], function(err, user_object, message) {
			
				count++;
		
				if(err) {
					callback(err, null);
					return false;
				}
			
				if(user_object) {
					output[user_object.id] = user_object;
				} else {
					user_object = {id:message.original_query};
					output[message.original_query] = user_object;
				}
			
				for(var ii=0; options.required.length > ii; ii++) {
					if(!user_object[options.required[ii]]) {
						needs_fetching.does=true;
						needs_fetching.ids.push(user_object.id);
					}
				}
				if(count === ids.length) {
				
					if(needs_fetching.does) {
						updateTwitterUsers(needs_fetching.ids, options.required, function(err, response) {
							for(var iii in response) {
								for(var iiii in response[iii]) {
									if(output[iii]) {
										output[iii][iiii] = response[iii][iiii];
									}
								}
							}
						
							callback(null, output);
						});
					} else {
						callback(null, output);
					}
				}
			
				//TODO: Do something if there are more than 100 things to fetch since
				//      that is Twitters limit.
				
			
			});
		}
		
	}
	
}

exports.getUserId = function() {
	return user_id;
}

exports.getFriends = function(user, creds, callback) {
	if(!twitter_friends) {
		var oauth = new OAuth(
			'https://api.twitter.com/oauth/request_token',
			'https://api.twitter.com/oauth/access_token',
			keys.twitter.key,
			keys.twitter.secret,
			'1.0A',
			null,
			'HMAC-SHA1'
		);
		oauth.get(
			'https://api.twitter.com/1.1/friends/ids.json?cursor=-1&user_id='+user.id+'&count=5000',
			creds[0],
			creds[1],            
			function (e, data, res){
				if (e) console.error(e);
				twitter_friends = JSON.parse(data).ids;     
				callback(null, twitter_friends);
			}
		);
	} else {
		callback(null, twitter_friends);
	}
}