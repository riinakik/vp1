const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
//päringulahtiharutamiseks POST päringute puhul
const bodyparser = require("body-parser");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
//päringu urli parsimine, false, kui ainult tekst
app.use(bodyparser.urlencoded({extended: false}));


app.get("/vanasonad", (req, res)=>{
	//res.send("Express läks käima!");
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
	fs.open("public/textfiles/visitlog.txt", "a", (err, file)=> {
		if (err){
			throw err;
		}
		else{
			fs.appendFile("public/textfiles/visitlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ";", (err)=> { 
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



app.listen(5113);