//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true});

//to use mongoose-encryption, proper mongoose shcema is needed instead of just javascript object notation.
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//Use convenience method of encryption using "Secret String Instead of Two Keys" method to encrypt password.
//AES 256 Encryption method.
//const secret = process.env.SOME_LONG_UNGUESSABLE_STRING;
const secret = process.env.SECRET;
//create encryption for userSchema with plugin to encrypt the database table schema
//to encrypt a certain field. Specify it after "secret keypair" follow by comma encryptedFields: [ArrayOfFields].
userSchema.plugin(encrypt, {secret: secret, encryptedFields: ["password"]});

//create Users table model based on userSchema
const User = mongoose.model("User", userSchema);


app.get("/", function(req, res){

    res.render("home");
});

app.get("/login", function(req, res){
    
    res.render("login");
});
app.get("/register", function(req, res){
    
    res.render("register");
});

app.post("/register", function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    //create user document from User model schema
    const newUser = new User({
        email: username,
        password: password
    });

    //save user to users table schema
    newUser.save()
    .then((user)=>{
        res.render("secrets");
    })
    .catch((err)=>{
        res.send(err + " Please try again");
    });

});

app.post("/login", function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email: username})
    .then((foundUser)=>{
        if (foundUser){
            if (foundUser.password == password){
                res.render("secrets");
            }
            else{
                res.send("Incorrect password");
            }

        }
        else{
            res.send("User not found");
        }
    })
    .catch((err)=>{
        res.send(err);
    });

});


app.listen(3000, function(){
    console.log("Server started on port 3000");
});