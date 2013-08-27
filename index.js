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
	route           = require(__dirname + '/server_modules/route.js').init(app);

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

//
// Define person routes
//
route.ui('/', 'index.html', {
	app_title  : app_title,
	page_title : 'Welcome',
	module     : 'index'
});


route.ui('/update', 'update.html', {
	app_title  : app_title,
	page_title : 'Updating...',
	controller : 'update'
});

route.oauth('fitbit', keys.fitbit, function(err, response) {
	require(__dirname + '/server_modules/tracker.js').setupFitbit(user.getUserId(), {
		oauth_token  : response[1],
		oauth_secret : response[2],
		fitbit_id    : response[3].encoded_user_id
	}, function(err, response) {
		console.log('Fitbit is bound');
	});
});

//
// Define Auth route
//
app.get('/bind/moves',
	function(req, res){
		var tracker = require(__dirname + '/server_modules/tracker.js'),
		    moves   = tracker.getClient('moves');
		
		moves.authorize({
			scope: ['activity', 'location']
		}, res);
	}
);

app.get('/bind/moves/callback?',
	function(req, res){
		var tracker = require(__dirname + '/server_modules/tracker.js'),
		    moves   = tracker.getClient('moves');
		moves.token(req.query.code, function(err, response, body) {
			if(err) {
				console.error('Error connecting to Moves', err);
				res.send(500, 'Something broke!');
			}
				
			tracker.setupMoves(user.getUserId(), JSON.parse(body), function(err, response) {
				
				if(err) {
					console.error('Error saving Moves credentials', err);
					return false;
				}
				
				res.redirect('/');
				
			});
		})
	}
);

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
