var user    = require(__dirname + '/../server_modules/user.js'),
    tracker = require(__dirname + '/../server_modules/tracker.js'),
    output  = {};
	
var today     = new Date(),
    yesterday = today.setDate(today.getDate() - 1),
	yesterday_string = new Date(yesterday).getFullYear() + '-' + (new Date(yesterday).getMonth() + 1) + '-' + new Date(yesterday).getDate();

yesterday_string = '2013-8-27'; //Dummy date for testing

exports.init = function(response, callback) {
	//
	// Get friends
	//
	if(response.request.user) {
		
		user.sessionSet('twitter_cred', response.request.user.twitter_cred);
		
		user.getFriends(response.request.user, response.request.user.twitter_cred, function(err, friends) {
			
			friends.push(response.request.user.id);
			
			//
			// Get day data
			//
			getDaysForUsers(friends, function(err, days) {
				
				rankDaysByStep(days, function(err, sorted_list) {
					
					var id_array = [];
					
					//
					// Get friend details
					//
					
					for(var i=0; sorted_list.length > i; i++) {
						id_array.push(sorted_list[i].user_id);
					}
					
					user.getUserDetails(id_array, {
						required : ['profile_image_url','name','screen_name']
					}, function(err, details) {

						for(var i=0; sorted_list.length > i; i++) {
							sorted_list[i].user = details[sorted_list[i].user_id];
						}
					
						callback({rankings:sorted_list});

					});
					
				});
				
			});
			
		});
	} else {
		callback(output);
	}
}

function rankDaysByStep(users_days, callback) {
	
	var sorter = [];
	
	for(var i in users_days) {
		sorter.push(users_days[i]);
	}
	
	sorter.sort(function(a,b){return a['steps']-b['steps']});
	
	callback(null, sorter);
	
}

function getDaysForUsers(friends, callback) {
	var friends_object = {},
	    response_count = 0;
	
	for(var i=0; friends.length > i; i++) {
		tracker.getDay(friends[i], yesterday_string, function(err, friend_day) {
			
			if(err) {
				callback(err, null);
				return false;
			}

			if(friend_day) {
				friends_object[friend_day.user_id] = friend_day;
			}
			
			response_count++;
			
			if(response_count === friends.length) {
				callback(null, friends_object);
			}
		});
	}
}