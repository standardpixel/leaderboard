var fs    = require('fs'),
    hbs   = require('hbs'),
	OAuth = require('oauth').OAuth;

//
// Standard person route
//
exports.init = function(app) {
	return {
		ui : function(route_definition, template_name, params) {
			app.get(route_definition, function(req,res) {

				if(req.user) {
					console.log(('\r\nHello ' + req.user.fullName).green);
				} else {
					console.log(('\r\nHello not authenticated person!'.blue));
				}
		
				fs.readFile(__dirname + '/../ui/' + template_name, 'utf8', function(error, data) {
					if(error) {
						console.error('Error: Could not load template'.red,error);
					} else {
						if(params.controller) {
							var controller = require(__dirname + '/../controllers/' + params.controller).init({
								request  : req,
								response : res
							}, function(response) {
								hbs.registerPartial('route-content', data);
						
								for(var i in response) {
									if(response.hasOwnProperty(i)) {
										params[i] = response[i];
									}
								}

								params['user'] = req.user;
								res.render('main-template.html', params);
							}, this);
						} else {
							hbs.registerPartial('route-content', data);

							params['user'] = req.user;

							res.render('main-template.html', params);
						}
					}
				});
			});
		},

		//
		// API Routes
		//
		api : function(route_definition, params) {
			app.post(route_definition, function(req,res) {
				var controller = require(__dirname + '/../controllers/' + params.controller).init({
					request : req,
					user    : req.params.user
				}, function(error,response) {
					res.json(response);
				}, this);
			});
		},
		
		//
		// Oauth Routes
		//
		oauth : function(service_name, config, callback) {
			
			console.log('>', service_name, config);
			
			var oa = new OAuth(config.oauth[0],config.oauth[1], config.oauth[2], config.oauth[3], config.oauth[4], config.oauth[5], config.oauth[6], config.oauth[7]);
			
			app.get('/bind/' + service_name, function(req, res){
				oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
					if (error) {
						console.log(error);
						res.send("There was an error connecting to fitbit.");
					}
					else {
						req.session.oauth = {};
						req.session.oauth.token = oauth_token;
						req.session.oauth.token_secret = oauth_token_secret;
						res.redirect(config.authorize + '?oauth_token='+oauth_token)
				}
				});
			});

			app.get('/bind/' + service_name + '/callback', function(req, res, next){
				
				if (req.session.oauth) {
					req.session.oauth.verifier = req.query.oauth_verifier;
					var oauth = req.session.oauth;

					oa.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
					function(error, oauth_access_token, oauth_access_token_secret, results){
						if (error){
							callback(error, null);
						} else {
							req.session.oauth.access_token = oauth_access_token;
							req.session.oauth,access_token_secret = oauth_access_token_secret;
							callback(null, arguments);
							res.redirect('/');
						}
					});
				} else {
					next(new Error("you're not supposed to be here."))
				}
			});
		}
	}
}