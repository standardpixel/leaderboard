var port            = 3000,
    fs              = require('fs'),
	http            = require('http'),
    express         = require('express'),
	colors          = require('colors'),
	passport        = require('passport'),
	TwitterStrategy = require('passport-twitter').Strategy,
    app             = express(),
	hbs             = require('hbs'),
	app_title       = 'StandardPixel Leaderboard',
	keys            = require(__dirname + '/keys.json'),
	user            = require(__dirname + '/server_modules/user.js'),
	fitbit          = require('fitbit-js')(keys.fitbit.key, keys.fitbit.secret);

app.use(express.cookieParser(keys.site.salt));
app.use(express.bodyParser());
app.use(express.methodOverride()); // must come after bodyParser
app.use(express.session({ secret: keys.site.salt, cookie: { maxAge: 6000000 } }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

app.set('views', __dirname + '/ui');
app.set('view engine', 'html');
app.engine('html', hbs.__express);

//
// Init PassportJS authentication
//

passport.use(new TwitterStrategy({
    consumerKey: keys.twitter.key,
    consumerSecret: keys.twitter.secret,
    callbackURL: "http://127.0.0.1:3000/hi/twitter"
  },
  function(token, tokenSecret, profile, done) {
    user.findOrCreate(profile, function (err, user) {
      return done(err, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  user.findById(id, function (err, user) {
    done(err, user);
  });
});

//
// Standard person route
//
function setupUIRoute(route_definition, template_name, params) {
	app.get(route_definition, function(req,res) {

		if(req.user) {
			console.log(('\r\nHello ' + req.user.fullName).green);
		} else {
			console.log(('\r\nHello not authenticated person!'.blue));
		}
		
		fs.readFile(__dirname + '/ui/' + template_name, 'utf8', function(error, data) {
			if(error) {
				console.error('Error: Could not load template'.red,error);
			} else {
				if(params.controller) {
					var controller = require(__dirname + '/controllers/' + params.controller).init({
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
}

//
// API Routes
//
function setupAPIRoute(route_definition, params) {
	app.post(route_definition, function(req,res) {
		var controller = require(__dirname + '/controllers/' + params.controller).init({
			request : req,
			user    : req.params.user
		}, function(error,response) {
			res.json(response);
		}, this);
	});
}

//
// 500 Error
//
app.use(function(err, req, res, next){
  console.error('There was an error loading this page'.red, err);
  res.send(500, 'Something broke!');
});

//
// Define Auth route
//
app.get('/hi',
  passport.authenticate('twitter'),
  function(req, res){ /* will not be called */ });

app.get('/hi/twitter', 
	passport.authenticate('twitter', { failureRedirect: '/hi' }),
	function(req, res) {
	res.redirect('/');
});

app.get('/fitbit', function (req, res) {
	if(req.user) {
		fitbit.getAccessToken(req, res, function (error, newToken) {
			if(newToken) {
				var tracker = require(__dirname + '/server_modules/tracker.js');
				tracker.setupFitbit(req.user.id, newToken.oauth_token, newToken.oauth_secret, function() {
					res.redirect('/');
				});
			}
		});
	} else {
		res.redirect('/hi');
	}
});

//
// Define person routes
//
setupUIRoute('/', 'index.html', {
	app_title  : app_title,
	page_title : 'Welcome',
	module     : 'index',
	controller : 'index'
});

//setupUIRoute('/fitbit', 'fitbit.html', {
//	app_title  : app_title,
//	page_title : 'Connecting to Fitbit...',
//	controller : 'fitbit_auth',
//	module     : 'fitbit'
//});

//
// Define static routes
//
app.use('/js', express.static(__dirname + '/ui/js'));
app.use('/style', express.static(__dirname + '/ui/style'));
app.use('/lib', express.static(__dirname + '/ui/lib'));

//
// Make it all go
//
app.listen = function(port){
  var server = http.createServer(this);
  console.log('\033[2J');
  console.log(('On ' + new Date()));
  console.log('\r\nthe '+ app_title.underline.blue +' app was started on port ' + port.toString().underline.blue);
  console.log('\r\nTo stop press Ctrl+C');
  return server.listen.apply(server, arguments);
};

app.listen(port);
