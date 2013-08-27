var keys       = require(__dirname + '/../keys.json'),
    colors     = require('colors'),
    redis      = require("redis"),
    rclient    = redis.createClient(),
	r_user_key = keys.site.redisKeyPrefix + 'user:',
	OAuth      = require('oauth').OAuth,
	user_id    = null;
	
	
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
				callback(null, user_decorated);
			} else {
				callback(null, null);
			}
		}
	
	});
}

exports.findOrCreate = function(user, callback) {
	
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
					callback(null, user_decorated);
				} else {
					console.error('Error adding user'.red, err);
				}
				
			});
		} else {
			callback(null, user_decorated);
		}
		
	});
}

exports.getUserId = function() {
	return user_id;
}

exports.getFriends = function(user, creds, callback) {
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
		creds.oauth_token,
		creds.oauth_secret,            
		function (e, data, res){
			if (e) console.error(e);        
			callback(null, data);
		}
	);
}

exports.findById = findById