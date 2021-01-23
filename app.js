//jshint esversion:6

// Requiring necessary libraries
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
var GoogleStrategy = require("passport-google-oauth20").Strategy;
var FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");

// Initializing express app
const app = express();

// Adding bodyParser, view engine, and static folder directory
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));

// Using express session
app.use(session({
  secret: "somesortofsecret",
  resave: false,
  saveUninitialized: false
}));

// Adding passport to the app
app.use(passport.initialize());
app.use(passport.session());

// Connecting to database using mongoose
mongoose.connect("mongodb://localhost:27017/SecretsDB", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

// Defining schema
const userSchema = mongoose.Schema({
                        email: String,
                        password: String,
                        googleId: String,
                        facebookId: String,
                        secret: String
                      });
// Adding plugins to schema
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// Creating mongoose modle out of the schema
const User = new mongoose.model("User", userSchema);

// Using the created Strategy with passport
passport.use(User.createStrategy());

// Serializing and deserializing user to store data inside cookies during a session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Adding google authentication Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },

  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// Defining App routes

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  User.find({ "secret": {$ne: null} }, (err, foundUsers) => {
    if(err){
      console.log(err);
    }else{
      if(foundUsers){
        res.render("secrets", { foundSecrets: foundUsers });
      }
    }
  })
});

app.post("/register", (req, res) => {
  User.register({ username: req.body.username }, req.body.password, (err, user) => {
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // On Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.post("/login", (req, res) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  req.login(user, (err) => {
    if(err){
      console.log(err);
    } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
    }
  });
});

// Facebook routes
app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/submit", (req, res) => {
  if(req.isAuthenticated()){
    res.render("submit");
  }else {
    res.redirect("/login");
  }
});


app.post("/submit", (req, res) => {
  const secret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id, (err, foundUser) => {
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = secret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.listen(3000, () => {
  console.log("Listening on port 3000...");
});
