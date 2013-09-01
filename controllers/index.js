var user    = require(__dirname + '/../server_modules/user.js'),
    tracker = require(__dirname + '/../server_modules/tracker.js'),
    output  = {};
	
var today     = new Date(),
    yesterday = today.setDate(today.getDate() - 1),
	yesterday_string = new Date(yesterday).getFullYear() + '-' + (new Date(yesterday).getMonth() + 1) + '-' + new Date(yesterday).getDate();

yesterday_string = '2013-8-27'; //Dummy date for testing

exports.init = function(response, callback) {
	var friends_object = {},
	    responses      = [],
		sorter         = [];
	
	if(response.request.user) {
		user.getFriends(response.request.user, response.request.user.twitter_cred, function(err, friends) {
			output.friends = friends;
			
			for(var i=0; friends.length > i; i++) {
				tracker.getDay(friends[i], yesterday_string, function(err, friend_tracker) {
					
					responses.push(friend_tracker);
					sorter[friend_tracker.steps] = friend_tracker.user_id;
					friends_object[friend_tracker.user_id] = friend_tracker;
					output.friends_data = friends_object;
					
					if(responses.length === friends.length) {
						
						responses = [];
						tracker.getDay(response.request.user.id, yesterday_string, function(err, my_tracker) {
							
							friends_object[response.request.user.id] = my_tracker;
							sorter[my_tracker.steps] = response.request.user.id;
							
							for(var ii=0; sorter.length > ii; ii++) {
								if(sorter[ii]) {
									friends_object[sorter[ii]].rank = ii;
									responses.push(sorter[ii]);
								}
							}
						
							output.rankings = responses;
							callback(output);
						});

					}
					
				});
			}
		});
	} else {
		callback(output);
	}
}