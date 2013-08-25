//var tracker = require(__dirname + '/server_modules/tracker.js');

//tracker.update('657073');

var OAuth   = require('oauth'),
    crypto  = require('crypto'),
    text    = 'I love cupcakes',
	key     = 'abcdeg',
	hash;

/*
request.post({
  headers: {
	  'content-type' : 'application/x-www-form-urlencoded',
	  'Authorization' : 'oauth_version=1.0&consumer_key=56337cd0d2d447e693f138846b97d351&oauth_token=5b359892e730a08991455b2d52d28c48&oauth_nonce=monkey&oauth_timestamp&oauth_verifier=t9ma488co2c2gk0vbma94imdn8' + new Date().getTime()
  },
  url:     'http://api.fitbit.com/oauth/access_token'
}, function(error, response, body){
  console.log(body);
});
*/

//console.log(crypto.createHmac('sha1', key).update(text).digest('hex'));


var oauth = new OAuth.OAuth(
	'http://api.fitbit.com/oauth/request_token',
	'https://api.twitter.com/oauth/access_token',
	'56337cd0d2d447e693f138846b97d351',
	'a88950f5725b45a88ad61af774880d26',
	'1.0A',
	null,
	'HMAC-SHA1'
);

oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
		function(error, oauth_access_token, oauth_access_token_secret, results){
			if (error){
				console.log(error);
				res.send("yeah something broke.");
			} else {
				req.session.oauth.access_token = oauth_access_token;
				req.session.oauth,access_token_secret = oauth_access_token_secret;
				console.log(results);
				res.send("worked. nice one.");
			}
		}
);

//console.log(oauth);


oauth.get(
	'https://api.twitter.com/1.1/trends/place.json?id=23424977',
	'5b359892e730a08991455b2d52d28c48', //test user token
	't9ma488co2c2gk0vbma94imdn8', //test user secret            
	function (e, data, res){
		if (e) console.error(e);        
			
		console.log(require('util').inspect(data)); 
});