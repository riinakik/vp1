const express = require("express");
const dtEt = require("./dateTime");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res)=>{
	//res.send("Express läks käima!");
	res.render("index.ejs");
});

app.get("/timenow",(req, res)=>{
	const weekdayNow = dtEt.daysEt();
	const dateNow = dtEt.dateEt();
	const timeNow = dtEt.hoursEt();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});
	
});

app.listen(5113);