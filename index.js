const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
const bodyparser = require("body-parser");       //päringulahtiharutamiseks POST päringute puhul

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended: false}));     //päringu urli parsimine, false, kui ainult tekst

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

app.get("/", (req, res) => {
    res.render("index.ejs"); // Anna index page!!!
});


app.get("/vanasonad", (req, res)=>{                    //VANASONAD
	//res.send("Express läks käima!");
	res.render("index.ejs");
});

app.get("/visitlog", (req, res)=>{                    //VISITLOG !!!
	res.render("index.ejs");
});


app.get("/timenow",(req, res)=>{
	const weekdayNow = dtEt.dayEt();
	const dateNow = dtEt.dateEt();
	const timeNow = dtEt.hoursEt();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});	
});

app.get("/justlist", (req, res)=>{
	let folkwisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=> {
		if (err){
			//throw err;
			res.render("justlist", {h2: "Vanasõnad", listData: ["Ei leidnud ühtegi vanasõna!"]});
		}
		else{
			folkwisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkwisdom});
		}	
	});
});

app.get("/regvisit", (req, res)=>{
	res.render ("regvisit");
});

app.post("/regvisit", (req, res)=>{
	console.log(req.body);
	
	
    const currentDateTime = new Date().toLocaleString('et-EE', {  // Get the current date and time
        timeZone: 'Europe/Tallinn', 
    });
	
	
	fs.open("public/textfiles/visitlog.txt", "a", (err, file)=> {
		if (err){
			throw err;
		}
		else{
			fs.appendFile("public/textfiles/visitlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ";" + " " + currentDateTime + "\n", (err)=> { 
			 if (err){
				 throw err;
			 }
			 else{
				 console.log("Faili kirjutati!");
				 res.render("regvisit");
				 
			 }
		  });	
		}
	});	
});

app.get("/logvisit", (req, res) => {
    fs.readFile("public/textfiles/visitlog.txt", "utf8", (err, data) => {
        if (err) {
            res.render("logvisit", { h2: "Külastajate nimekiri", listData: ["Ei leidnud ühtegi külastust!"] });
        } else {
            const visitData = data.split('\n').filter(Boolean); // Filter empty entries
            res.render("logvisit", {
                //h2: "Külastajate nimekiri",
                listData: visitData
            });
        }
    });
});


//app.get("/logvisit", (req, res)=>{
//	res.render ("logvisit");
//});
app.get("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render ("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{
	let notice = "";
	let firstName = "";
	let lastName = "";
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		notice = "Osa andmeid sisestamata!";
		res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
	}
	else{
		let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES(?,?)";
		conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err,
		sqlres)=>{
			if (err){
				throw err;
			}
			else {
				notice = "Külastus registreeritud";
				res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
			}
	});
	}
});

app.get("/eestifilm", (req, res)=>{
	res.render ("filmindex");
});

app.get("/eestifilm/tegelased", (req, res)=>{
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	let persons = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			persons = sqlres;
			res.render("tegelased", {persons: persons});
		}
	});	
});


app.listen(5113);