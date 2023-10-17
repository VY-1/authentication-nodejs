//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const _ = require("lodash");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));


//FIRST, need to set app to use session for it to work
app.use(session({
    secret: "Our little secret",
    resave: false,
    saveUninitialized: false
}));

//SECOND, to use passport, first initialize passport, and set passport to use session.
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});
//mongoose.set("useCreateIndex", true);

//to use mongoose-encryption, proper mongoose shcema is needed instead of just javascript object notation.
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

//THIRD
//set userSchema to use plugin passportLocalMongoose in order to salt and hash the password
userSchema.plugin(passportLocalMongoose);

//set userSchema to use findOrCreate plugin
userSchema.plugin(findOrCreate);


//create Users table model based on userSchema
const User = mongoose.model("User", userSchema);

//FOURTH, create strategy and serialize and deserialize User.

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done){
    done(null, user);
});

passport.deserializeUser(function(user, done){
    done(null, user);
});

//Configure passport to use GoogleStrategy for OAuth2.0

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });

    // use done(err, profile)  if using with database
    //return done(null, profile);
  }
));


app.get("/", function(req, res){

    res.render("home");
});

app.get("/auth/google",
    //authenticate use google strategy method, user profile info for scope
    passport.authenticate('google', { scope: ["email", "profile"]})
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    
    res.render("login");
});
app.get("/register", function(req, res){
    
    res.render("register");
});

app.get("/secrets", function(req, res){
    
    console.log("From /secrets: " + req.isAuthenticated());
    
    if (req.isAuthenticated()){
        User.find({"secret": {$ne:null}})
        .then((usersSecrets)=>{
            res.render("secrets", {usersSecrets: usersSecrets});
        })
        .catch((err)=>{
            res.send(err);
        });

        
    }else{
        res.redirect("/login");
    }
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout", function(req, res){
    //Passport method to logout
    req.logout(function(err){
        if (err){
            res.send(err);
        }
        else{
            res.redirect("/");
        }
    });
    
});

app.post("/register", function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    //Passport method for user to register
    User.register({username: username}, password, function(err, user){
        if(err){
            console.log(err);
            res.redirect("/register");

        }else{
            //authenticate user with cookies in local browser
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }
    });
    

});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    const user = new User({
        username: username,
        password: password
    });

    //passport method for login
    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            //authenticate user with cookies in local browser
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            });
        }

    }); 

});

app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;
    console.log(req.user._id);
    User.findById(req.user._id)
    .then((foundUser)=>{
        foundUser.secret = submittedSecret;
        foundUser.save();
        res.redirect("/secrets");
    })
    .catch((err)=>{
        res.send(err);
    })
});


app.listen(3000, function(){
    console.log("Server started on port 3000");
});